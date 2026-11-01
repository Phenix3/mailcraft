import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  resolveSmtpTransportForUser: vi.fn(async () => ({ id: 7, host: "smtp.example.test", port: 587, username: "user", password: "pass", fromEmail: "hello@example.test", fromName: "MailCraft", replyTo: null })),
  createSmtpTransport: vi.fn(),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("nodemailer", () => ({ default: { createTransport: mocks.createTransport } }));
vi.mock("./smtp-profiles", () => ({ resolveSmtpTransportForUser: mocks.resolveSmtpTransportForUser, createSmtpTransport: mocks.createSmtpTransport }));

import {
  buildCronExpression,
  createUnsubscribeToken,
  getSmtpConfigurationStatus,
  isAutomationRecipientEligible,
  isValidUnsubscribeToken,
  parseSubscribersCsv,
  renderEmailHtml,
  renderTestEmailHtml,
  sendTestEmail,
} from "./email";

describe("parseSubscribersCsv", () => {
  it("lit les contacts, les noms et les tags sans conserver les lignes invalides", () => {
    const rows = parseSubscribersCsv("email,first_name,last_name,tags\nhello@example.com,Ada,Lovelace,client|webinar\ninvalide,No,Name,ignore\n");
    expect(rows).toEqual([{ email: "hello@example.com", firstName: "Ada", lastName: "Lovelace", tags: ["client", "webinar"] }]);
  });

  it("rejette un fichier dépourvu de colonne email", () => {
    expect(() => parseSubscribersCsv("nom,tags\nAda,client")).toThrow("colonne email");
  });
});

describe("rendu de campagne", () => {
  const tracking = { campaignId: 17, subscriberId: 4, baseUrl: "https://mailcraft.example" };

  it("encode le texte et insère les liens de suivi", () => {
    const html = renderEmailHtml([{ id: "1", type: "heading", content: "Bienvenue <Ada>" }, { id: "2", type: "button", content: "Lire", url: "https://example.com/guide" }], tracking);
    expect(html).toContain("Bienvenue &lt;Ada&gt;");
    expect(html).toContain("/t/click/17/4?url=https%3A%2F%2Fexample.com%2Fguide");
    expect(html).toContain("/t/open/17/4.gif");
    expect(html).toContain("/unsubscribe?c=17&amp;s=4");
  });
});

describe("email de test", () => {
  it("neutralise tous les pixels, liens de suivi et liens de désabonnement", () => {
    const html = renderTestEmailHtml([{ id: "button", type: "button", content: "Lire", url: "https://example.com/guide" }]);
    expect(html).toContain('href="https://example.com/guide"');
    expect(html).not.toContain("/t/click/");
    expect(html).not.toContain("/t/open/");
    expect(html).not.toContain("/unsubscribe?");
  });

  it("n’écrit aucune livraison ni métrique lors d’un envoi de test réussi", async () => {
    const original = { ...process.env };
    Object.assign(process.env, { SMTP_HOST: "smtp.example.test", SMTP_PORT: "587", SMTP_USER: "user", SMTP_PASS: "pass", SMTP_FROM: "MailCraft <hello@example.test>" });
    const limit = vi.fn(async () => [{ fromName: "MailCraft", replyTo: null }]);
    const db = { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit })) })) })) } as any;
    mocks.getDb.mockResolvedValueOnce(db);
    mocks.createSmtpTransport.mockReturnValueOnce({ sendMail: mocks.sendMail });
    mocks.sendMail.mockResolvedValueOnce({ messageId: "test-id" });
    try {
      await expect(sendTestEmail({ userId: 8, recipientEmail: "preview@example.com", subject: "Aperçu", blocks: [{ id: "body", type: "text", content: "Bonjour" }], baseUrl: "https://mailcraft.example" })).resolves.toMatchObject({ sent: true, smtpProfileId: 7 });
      expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "preview@example.com", subject: "[Test] Aperçu", headers: { "X-MailCraft-Email-Type": "test" } }));
      expect(db.insert).toBeUndefined();
      expect(db.update).toBeUndefined();
      expect(mocks.sendMail.mock.calls[0][0].html).not.toContain("/t/open/");
      expect(mocks.sendMail.mock.calls[0][0].html).not.toContain("/t/click/");
    } finally {
      process.env = original;
    }
  });
});

describe("désabonnement sécurisé", () => {
  it("accepte uniquement le jeton associé à la campagne et au destinataire", () => {
    const token = createUnsubscribeToken(3, 9);
    expect(isValidUnsubscribeToken(3, 9, token)).toBe(true);
    expect(isValidUnsubscribeToken(3, 10, token)).toBe(false);
  });
});

describe("expression de planification", () => {
  it("produit une expression à six champs en UTC", () => {
    expect(buildCronExpression(Date.UTC(2026, 7, 21, 9, 35, 0))).toBe("0 35 9 21 8 *");
  });
});

describe("configuration SMTP", () => {
  it("indique précisément les variables de transport manquantes", () => {
    const original = { ...process.env };
    delete process.env.SMTP_HOST; delete process.env.SMTP_PORT; delete process.env.SMTP_USER; delete process.env.SMTP_PASS; delete process.env.SMTP_FROM;
    expect(getSmtpConfigurationStatus()).toEqual({ configured: false, missing: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"] });
    process.env = original;
  });
});

describe("éligibilité des auto-répondeurs", () => {
  const currentTime = Date.UTC(2026, 7, 21, 12, 0, 0);

  it("n’envoie qu’après le délai prévu, à une inscription postérieure à l’activation", () => {
    expect(isAutomationRecipientEligible({ subscriberCreatedAt: currentTime - 20 * 60_000, subscriberStatus: "active", activatedAt: currentTime - 30 * 60_000, delayMinutes: 15, alreadyDelivered: false, now: currentTime })).toBe(true);
    expect(isAutomationRecipientEligible({ subscriberCreatedAt: currentTime - 10 * 60_000, subscriberStatus: "active", activatedAt: currentTime - 30 * 60_000, delayMinutes: 15, alreadyDelivered: false, now: currentTime })).toBe(false);
    expect(isAutomationRecipientEligible({ subscriberCreatedAt: currentTime - 20 * 60_000, subscriberStatus: "active", activatedAt: currentTime - 5 * 60_000, delayMinutes: 15, alreadyDelivered: false, now: currentTime })).toBe(false);
  });

  it("exclut les adresses déjà traitées, désabonnées ou en rebond définitif", () => {
    for (const subscriberStatus of ["unsubscribed", "bounced"] as const) expect(isAutomationRecipientEligible({ subscriberCreatedAt: currentTime - 20 * 60_000, subscriberStatus, activatedAt: currentTime - 30 * 60_000, delayMinutes: 15, alreadyDelivered: false, now: currentTime })).toBe(false);
    expect(isAutomationRecipientEligible({ subscriberCreatedAt: currentTime - 20 * 60_000, subscriberStatus: "active", activatedAt: currentTime - 30 * 60_000, delayMinutes: 15, alreadyDelivered: true, now: currentTime })).toBe(false);
  });
});
