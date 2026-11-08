import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  registerBounce: vi.fn(),
  invokeLLM: vi.fn(),
  sendTestEmail: vi.fn(),
  resolveSmtpTransportForUser: vi.fn(async () => ({ id: 7 })),
}));

vi.mock("./db", () => ({
  getDb: mocks.getDb,
  registerBounce: mocks.registerBounce,
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: mocks.invokeLLM,
}));

vi.mock("./email", async importOriginal => {
  const actual = await importOriginal<typeof import("./email")>();
  return { ...actual, sendTestEmail: mocks.sendTestEmail };
});

vi.mock("./smtp-profiles", async importOriginal => {
  const actual = await importOriginal<typeof import("./smtp-profiles")>();
  return { ...actual, resolveSmtpTransportForUser: mocks.resolveSmtpTransportForUser };
});

import { appRouter } from "./routers";
import { buildDeliverabilityAlerts, buildDeliverabilityTrend, parseEmailSuggestion } from "./routers/marketing";

function context(role: "user" | "admin" = "user"): TrpcContext {
  const now = new Date();
  return {
    user: { id: 8, openId: "mailcraft-test", name: "MailCraft Test", email: "test@example.com", loginMethod: "password", role, createdAt: now, updatedAt: now, lastSignedIn: now },
    req: { protocol: "https", headers: { cookie: "" }, get: () => "mailcraft.example" } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as TrpcContext["res"],
  };
}

function dbWithSource(source: Record<string, unknown>) {
  return {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => [source]) })) })) })),
    insert: vi.fn(() => ({ values: vi.fn(async () => [{ insertId: 41 }]) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) })),
  } as any;
}

function dbWithConsentSubscriber() {
  const values = vi.fn(() => ({ onDuplicateKeyUpdate: vi.fn(async () => undefined) }));
  return {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => [{ id: 19, userId: 8, email: "consent@example.com" }]) })) })) })),
    insert: vi.fn(() => ({ values })),
    values,
  } as any;
}

function dbWithUpsert() {
  const values = vi.fn(() => ({ onDuplicateKeyUpdate: vi.fn(async () => undefined) }));
  return { insert: vi.fn(() => ({ values })), values } as any;
}

function dbWithTemplateList(items: Record<string, unknown>[]) {
  return {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ orderBy: vi.fn(async () => items), limit: vi.fn(async () => items) })) })) })),
  } as any;
}

function dbWithTemplateUpdate(affectedRows = 1) {
  const set = vi.fn(() => ({ where: vi.fn(async () => [{ affectedRows }]) }));
  return { update: vi.fn(() => ({ set })), set } as any;
}

function dbWithTemplateDelete() {
  const where = vi.fn(async () => undefined);
  return { delete: vi.fn(() => ({ where })), where } as any;
}

describe("marketing procedures critiques", () => {
  it("interdit l’administration de conformité à un compte non administrateur", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.marketing.admin.compliance.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("enregistre un rebond par la procédure réservée à l’administration", async () => {
    mocks.registerBounce.mockResolvedValueOnce({ subscriberId: 11, suppressed: true });
    const caller = appRouter.createCaller(context("admin"));
    const result = await caller.marketing.admin.compliance.registerBounce({ recipientEmail: "bounce@example.com", type: "hard", reason: "Mailbox unavailable" });
    expect(result).toEqual({ subscriberId: 11, suppressed: true });
    expect(mocks.registerBounce).toHaveBeenCalledWith(expect.objectContaining({ userId: 8, recipientEmail: "bounce@example.com", type: "hard" }));
  });

  it("crée un auto-répondeur désactivé par défaut", async () => {
    const db = dbWithSource({});
    mocks.getDb.mockResolvedValueOnce(db);
    const caller = appRouter.createCaller(context("user"));
    const result = await caller.marketing.automations.create({ name: "Bienvenue", delayMinutes: 15, targetSegmentId: null, subject: "Bonjour", previewText: "", contentBlocks: [{ id: "body", type: "text", content: "Bienvenue" }] });
    expect(result).toEqual({ id: 41 });
    expect(db.insert.mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({ status: "paused", trigger: "subscriber_created", delayMinutes: 15 }));
  });

  it("consigne le consentement lors de l’ajout manuel d’un abonné", async () => {
    const db = dbWithConsentSubscriber();
    mocks.getDb.mockResolvedValueOnce(db);
    const caller = appRouter.createCaller(context("user"));
    await caller.marketing.subscribers.create({ email: "consent@example.com", firstName: "Ada", tags: [], consent: { basis: "consent", source: "formulaire_site", proof: "checkbox" } });
    expect(db.values.mock.calls).toContainEqual([expect.objectContaining({ subscriberId: 19, action: "granted", basis: "consent", source: "formulaire_site", proof: "checkbox" })]);
  });

  it("duplique une campagne en revenant à l’état brouillon", async () => {
    const db = dbWithSource({ id: 3, userId: 8, title: "Newsletter", subject: "Sujet", previewText: null, contentBlocks: "[]", targetSegmentId: null });
    mocks.getDb.mockResolvedValueOnce(db);
    const caller = appRouter.createCaller(context("user"));
    const result = await caller.marketing.campaigns.duplicate({ id: 3 });
    expect(result).toEqual({ id: 41 });
    expect(db.insert.mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({ status: "draft", title: "Newsletter — copie", userId: 8 }));
  });

  it("bloque la planification lorsqu’aucun profil SMTP actif n’est configuré", async () => {
    mocks.getDb.mockResolvedValueOnce(dbWithSource({ id: 3, userId: 8, title: "Newsletter", status: "draft", scheduleCronTaskUid: null }));
    mocks.resolveSmtpTransportForUser.mockRejectedValueOnce(new Error("Aucun profil SMTP actif n’est configuré pour votre organisation."));
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.marketing.campaigns.schedule({ id: 3, scheduledFor: Date.now() + 120_000 })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("programme une campagne avec un identifiant de tâche interne", async () => {
    const original = { ...process.env };
    Object.assign(process.env, { SMTP_HOST: "smtp.example.test", SMTP_PORT: "587", SMTP_USER: "user", SMTP_PASS: "pass", SMTP_FROM: "MailCraft <hello@example.test>" });
    const db = dbWithSource({ id: 3, userId: 8, title: "Newsletter", status: "draft", scheduleCronTaskUid: null });
    mocks.getDb.mockResolvedValueOnce(db);
    const caller = appRouter.createCaller(context("user"));
    try {
      const result = await caller.marketing.campaigns.schedule({ id: 3, scheduledFor: Date.now() + 120_000 });
      expect(result.scheduledFor).toBeGreaterThan(Date.now());
      expect(db.update.mock.results[0].value.set).toHaveBeenCalledWith(expect.objectContaining({ status: "scheduled", scheduleCronTaskUid: "local-3" }));
    } finally {
      process.env = original;
    }
  });

  it("retourne une suggestion IA structurée sans exposer le modèle au navigateur", async () => {
    const original = { ...process.env };
    Object.assign(process.env, { OPENAI_MODEL: "gpt-5-mini" });
    mocks.invokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ subject: "Un objet concis", previewText: "Un pré-en-tête", heading: "Un titre", body: "Un message utile.", ctaLabel: "Découvrir", rationale: "Texte plus direct." }) } }] });
    mocks.getDb.mockResolvedValueOnce({});
    const caller = appRouter.createCaller(context("user"));
    try {
      const result = await caller.marketing.ai.emailAssistant({ task: "draft", language: "anglais", tone: "professionnel", brandTone: "premium", objective: "Présenter une nouveauté", blocks: [] });
      expect(result).toMatchObject({ subject: "Un objet concis", ctaLabel: "Découvrir", model: "gpt-5-mini" });
      expect(mocks.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5-mini" }));
      expect(mocks.invokeLLM.mock.calls[0][0].messages[1].content).toContain("langueDeSortie");
      expect(mocks.invokeLLM.mock.calls[0][0].messages[1].content).toContain("premium");
    } finally {
      process.env = original;
    }
  });

  it("utilise le modèle IA par défaut lorsque OPENAI_MODEL n'est pas défini", async () => {
    const original = { ...process.env };
    delete process.env.OPENAI_MODEL;
    mocks.invokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ subject: "Objet", previewText: "Pré", heading: "Titre", body: "Corps", ctaLabel: "CTA", rationale: "Pourquoi." }) } }] });
    mocks.getDb.mockResolvedValueOnce({});
    const caller = appRouter.createCaller(context("user"));
    try {
      const result = await caller.marketing.ai.emailAssistant({ task: "draft", language: "français", tone: "direct", brandTone: "sobre", objective: "Annoncer une mise à jour", blocks: [] });
      expect(result.model).toBe("gpt-4o-mini");
    } finally {
      process.env = original;
    }
  });

  it("interprète une suggestion IA contenue dans une réponse multipartie balisée", () => {
    const payload = { subject: "Objet clair", previewText: "Pré-en-tête", heading: "Titre", body: "Corps utile", ctaLabel: "Découvrir", rationale: "Message concis." };
    const response = { choices: [{ message: { content: [{ type: "text", text: `Voici la suggestion :\n\`\`\`json\n${JSON.stringify(payload)}\n\`\`\`` }] }, finish_reason: "stop" }] } as any;
    expect(parseEmailSuggestion(response)).toEqual(payload);
  });

  it("interprète une suggestion IA JSON doublement encodée", () => {
    const payload = { subject: "Objet clair", previewText: "Pré-en-tête", heading: "Titre", body: "Corps utile", ctaLabel: "Découvrir", rationale: "Message concis." };
    const response = { choices: [{ message: { content: JSON.stringify(JSON.stringify(payload)) }, finish_reason: "stop" }] } as any;
    expect(parseEmailSuggestion(response)).toEqual(payload);
  });

  it("borne côté serveur les champs de suggestion IA trop longs", () => {
    const response = { choices: [{ message: { content: JSON.stringify({ subject: "s".repeat(100), previewText: "p".repeat(120), heading: "h".repeat(90), body: "b".repeat(400), ctaLabel: "c".repeat(40), rationale: "r".repeat(200) }) }, finish_reason: "stop" }] } as any;
    expect(parseEmailSuggestion(response)).toEqual({ subject: "s".repeat(70), previewText: "p".repeat(100), heading: "h".repeat(75), body: "b".repeat(320), ctaLabel: "c".repeat(28), rationale: "r".repeat(160) });
  });

  it("agrège les rebonds et désabonnements par journée avec leurs taux", () => {
    const dayOne = Date.UTC(2026, 7, 20, 10);
    const dayTwo = Date.UTC(2026, 7, 21, 11);
    const trend = buildDeliverabilityTrend([{ unsubscribedAt: dayOne }, { unsubscribedAt: null }, { unsubscribedAt: dayTwo }, { unsubscribedAt: null }], [{ occurredAt: dayOne }, { occurredAt: dayOne }]);
    expect(trend).toEqual([{ date: "2026-08-20", rebonds: 2, desabonnements: 1, tauxRebond: 50, tauxDesabonnement: 25 }, { date: "2026-08-21", rebonds: 0, desabonnements: 1, tauxRebond: 0, tauxDesabonnement: 25 }]);
  });

  it("signale les seuils critiques de rebond et de désabonnement", () => {
    const alerts = buildDeliverabilityAlerts([{ status: "unsubscribed" }, { status: "active" }, { status: "active" }, { status: "active" }], [{ type: "hard" }]);
    expect(alerts).toEqual([{ key: "bounce", label: "Taux de rebond", rate: 25, threshold: 2, critical: true }, { key: "unsubscribe", label: "Taux de désabonnement", rate: 25, threshold: 1, critical: true }]);
  });

  it("utilise les seuils de délivrabilité personnalisés", () => {
    const alerts = buildDeliverabilityAlerts([{ status: "active" }, { status: "active" }, { status: "active" }, { status: "active" }], [{ type: "hard" }], { bounceThresholdBps: 3000, unsubscribeThresholdBps: 500 });
    expect(alerts[0]).toMatchObject({ rate: 25, threshold: 30, critical: false });
    expect(alerts[1]).toMatchObject({ rate: 0, threshold: 5, critical: false });
  });

  it("enregistre les seuils personnels sous forme de points de base", async () => {
    const db = dbWithUpsert();
    mocks.getDb.mockResolvedValueOnce(db);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.marketing.settings.delivery.save({ bounceThreshold: 2.5, unsubscribeThreshold: 1.25 })).resolves.toEqual({ success: true });
    expect(db.values).toHaveBeenCalledWith(expect.objectContaining({ userId: 8, bounceThresholdBps: 250, unsubscribeThresholdBps: 125 }));
  });

  it("applique les instructions du profil de marque sélectionné à l’assistant IA", async () => {
    mocks.invokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ subject: "Objet", previewText: "Pré-en-tête", heading: "Titre", body: "Message", ctaLabel: "Lire", rationale: "Voix respectée." }) } }] });
    mocks.getDb.mockResolvedValueOnce(dbWithSource({ id: 4, userId: 8, name: "Voix produit", tone: "premium", instructions: "Écrire avec précision et sobriété." }));
    const caller = appRouter.createCaller(context("user"));
    await caller.marketing.ai.emailAssistant({ task: "draft", tone: "professionnel", brandTone: "sobre", brandProfileId: 4, objective: "Présenter une nouveauté", blocks: [] });
    expect(mocks.invokeLLM.mock.calls.at(-1)?.[0].messages[1].content).toContain("Voix produit");
    expect(mocks.invokeLLM.mock.calls.at(-1)?.[0].messages[1].content).toContain("Écrire avec précision et sobriété.");
  });

  it("bloque l’envoi de test lorsqu’aucun profil SMTP actif n’est configuré", async () => {
    mocks.resolveSmtpTransportForUser.mockRejectedValueOnce(new Error("Aucun profil SMTP actif n’est configuré pour votre organisation."));
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.marketing.campaigns.sendTest({ recipientEmail: "test@example.com", subject: "Test", contentBlocks: [{ id: "body", type: "text", content: "Bonjour" }] })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("envoie un test sans écrire de métrique ni de livraison de campagne", async () => {
    const original = { ...process.env };
    Object.assign(process.env, { SMTP_HOST: "smtp.example.test", SMTP_PORT: "587", SMTP_USER: "user", SMTP_PASS: "pass", SMTP_FROM: "MailCraft <hello@example.test>" });
    const db = dbWithSource({});
    mocks.getDb.mockResolvedValueOnce(db);
    mocks.sendTestEmail.mockResolvedValueOnce({ sent: true });
    const caller = appRouter.createCaller(context("user"));
    try {
      await expect(caller.marketing.campaigns.sendTest({ recipientEmail: "preview@example.com", subject: "Test de campagne", previewText: "Aperçu", contentBlocks: [{ id: "body", type: "text", content: "Bonjour" }] })).resolves.toMatchObject({ sent: true });
      expect(mocks.sendTestEmail).toHaveBeenCalledWith(expect.objectContaining({ userId: 8, recipientEmail: "preview@example.com", subject: "Test de campagne", baseUrl: "https://mailcraft.example" }));
      expect(db.insert.mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({ userId: 8, recipientEmail: "preview@example.com", subject: "Test de campagne" }));
    } finally {
      process.env = original;
    }
  });

  it("renvoie un email depuis son historique à la même adresse par défaut", async () => {
    const original = { ...process.env };
    Object.assign(process.env, { SMTP_HOST: "smtp.example.test", SMTP_PORT: "587", SMTP_USER: "user", SMTP_PASS: "pass", SMTP_FROM: "MailCraft <hello@example.test>" });
    const item = { id: 9, userId: 8, recipientEmail: "history@example.com", subject: "Aperçu produit", previewText: "Résumé", contentBlocks: "[{\"id\":\"body\",\"type\":\"text\",\"content\":\"Bonjour\"}]" };
    const db = dbWithSource(item);
    mocks.getDb.mockResolvedValueOnce(db).mockResolvedValueOnce(db);
    mocks.sendTestEmail.mockResolvedValueOnce({ sent: true });
    const caller = appRouter.createCaller(context("user"));
    try {
      await expect(caller.marketing.settings.testEmails.resend({ id: 9 })).resolves.toMatchObject({ sent: true });
      expect(mocks.sendTestEmail).toHaveBeenCalledWith(expect.objectContaining({ recipientEmail: "history@example.com", subject: "Aperçu produit" }));
    } finally {
      process.env = original;
    }
  });

  it("expose la collection intégrée de modèles avec ses métadonnées", async () => {
    const caller = appRouter.createCaller(context("user"));
    const items = await caller.marketing.templates.builtins();
    expect(items).toEqual(expect.arrayContaining([expect.objectContaining({ id: "mailcraft-editorial", category: "Newsletter", status: "active", source: "builtin" })]));
  });

  it("crée un modèle personnel enrichi avec tags, statut et favori", async () => {
    const db = dbWithSource({});
    mocks.getDb.mockResolvedValueOnce(db);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.marketing.templates.create({ name: "Annonce produit", subject: "Une nouveauté", category: "Produit", description: "Pour une annonce concise.", tags: ["produit", "lancement"], status: "active", isFavorite: true, contentBlocks: [{ id: "title", type: "heading", content: "Voici la nouveauté" }] })).resolves.toEqual({ id: 41 });
    expect(db.insert.mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({ userId: 8, name: "Annonce produit", tags: JSON.stringify(["produit", "lancement"]), status: "active", isFavorite: 1, usageCount: 0 }));
  });

  it("duplique un modèle en le réactivant et en annulant son favori", async () => {
    const db = dbWithSource({ id: 15, userId: 8, name: "Newsletter", subject: "Sujet", category: "Newsletter", description: "Description", tags: "[\"hebdo\"]", status: "archived", isFavorite: 1, previewText: "Aperçu", contentBlocks: "[]", sourceCampaignId: 4 });
    mocks.getDb.mockResolvedValueOnce(db);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.marketing.templates.duplicate({ id: 15 })).resolves.toEqual({ id: 41 });
    expect(db.insert.mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({ name: "Newsletter — copie", status: "active", isFavorite: 0, usageCount: 0 }));
  });

  it("crée un modèle depuis une campagne appartenant à l’utilisateur", async () => {
    const db = dbWithSource({ id: 5, userId: 8, subject: "Objet campagne", previewText: "Pré-en-tête", contentBlocks: "[{\"id\":\"body\",\"type\":\"text\",\"content\":\"Bonjour\"}]" });
    mocks.getDb.mockResolvedValueOnce(db);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.marketing.templates.createFromCampaign({ campaignId: 5, name: "Base campagne", category: "Personnel", description: "Réutilisable", tags: ["source"] })).resolves.toEqual({ id: 41 });
    expect(db.insert.mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({ sourceCampaignId: 5, subject: "Objet campagne", category: "Personnel", tags: JSON.stringify(["source"]) }));
  });

  it("refuse d’appliquer un modèle archivé à une campagne", async () => {
    const db = dbWithSource({ id: 15, userId: 8, name: "Ancien modèle", subject: "Sujet", category: "Newsletter", status: "archived", usageCount: 0, previewText: null, contentBlocks: "[]" });
    mocks.getDb.mockResolvedValueOnce(db);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.marketing.templates.applyToCampaign({ templateId: 15 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("applique un modèle intégré à un nouveau brouillon", async () => {
    const db = dbWithSource({});
    mocks.getDb.mockResolvedValueOnce(db);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.marketing.templates.applyBuiltin({ templateId: "mailcraft-launch" })).resolves.toEqual({ campaignId: 41 });
    expect(db.insert.mock.results[0].value.values).toHaveBeenCalledWith(expect.objectContaining({ userId: 8, title: "Lancement attentif", status: "draft" }));
  });

  it("filtre les modèles personnels par recherche, catégorie, statut et favori", async () => {
    const db = dbWithTemplateList([
      { id: 1, userId: 8, name: "Promotion rentrée", subject: "Une offre", category: "Produit", description: "Pour la rentrée", tags: "[\"promo\",\"septembre\"]", status: "active", isFavorite: 1, previewText: null, contentBlocks: "[]", usageCount: 0 },
      { id: 2, userId: 8, name: "Newsletter archive", subject: "Nouvelles", category: "Newsletter", description: null, tags: "[]", status: "archived", isFavorite: 0, previewText: null, contentBlocks: "[]", usageCount: 0 },
    ]);
    mocks.getDb.mockResolvedValueOnce(db);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.marketing.templates.list({ query: "promo", category: "Produit", status: "active", favoritesOnly: true })).resolves.toEqual([expect.objectContaining({ id: 1, tags: ["promo", "septembre"], isFavorite: true })]);
  });

  it("met à jour un modèle personnel enrichi", async () => {
    const db = dbWithTemplateUpdate();
    mocks.getDb.mockResolvedValueOnce(db);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.marketing.templates.update({ id: 2, name: "Newsletter mise à jour", subject: "Objet amélioré", category: "Newsletter", description: "Une base éditoriale.", tags: ["hebdo"], previewText: "À lire cette semaine", status: "active", isFavorite: true, contentBlocks: [{ id: "body", type: "text", content: "Bonjour" }] })).resolves.toEqual({ success: true });
    expect(db.set).toHaveBeenCalledWith(expect.objectContaining({ name: "Newsletter mise à jour", isFavorite: 1, tags: JSON.stringify(["hebdo"]) }));
  });

  it("bascule le favori et archive un modèle personnel", async () => {
    const favoriteDb = dbWithTemplateUpdate();
    const archiveDb = dbWithTemplateUpdate();
    mocks.getDb.mockResolvedValueOnce(favoriteDb).mockResolvedValueOnce(archiveDb);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.marketing.templates.toggleFavorite({ id: 2, isFavorite: true })).resolves.toEqual({ success: true });
    await expect(caller.marketing.templates.archive({ id: 2, archived: true })).resolves.toEqual({ success: true });
    expect(favoriteDb.set).toHaveBeenCalledWith(expect.objectContaining({ isFavorite: 1 }));
    expect(archiveDb.set).toHaveBeenCalledWith(expect.objectContaining({ status: "archived" }));
  });

  it("supprime un modèle uniquement dans le périmètre de son propriétaire", async () => {
    const db = dbWithTemplateDelete();
    mocks.getDb.mockResolvedValueOnce(db);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.marketing.templates.delete({ id: 2 })).resolves.toEqual({ success: true });
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(db.where).toHaveBeenCalledTimes(1);
  });

  it("applique un modèle personnel à une campagne existante et met à jour son usage", async () => {
    const db = dbWithSource({ id: 7, userId: 8, name: "Promotion", subject: "Une offre", category: "Produit", status: "active", usageCount: 2, previewText: "À découvrir", contentBlocks: "[{\"id\":\"body\",\"type\":\"text\",\"content\":\"Bonjour\"}]" });
    mocks.getDb.mockResolvedValueOnce(db);
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.marketing.templates.applyToCampaign({ templateId: 7, campaignId: 5 })).resolves.toEqual({ campaignId: 5 });
    expect(db.update.mock.results[0].value.set).toHaveBeenCalledWith(expect.objectContaining({ title: "Promotion", subject: "Une offre" }));
    expect(db.update.mock.results[1].value.set).toHaveBeenCalledWith(expect.objectContaining({ usageCount: 3 }));
  });
});
