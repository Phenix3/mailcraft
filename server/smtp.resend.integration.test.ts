import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

function testContext(): TrpcContext {
  const timestamp = new Date();
  return {
    user: { id: 1, openId: "smtp-send-validation", name: "SMTP validation", email: process.env.SMTP_USER ?? "smtp@example.test", loginMethod: "password", role: "user", createdAt: timestamp, updatedAt: timestamp, lastSignedIn: timestamp },
    req: { protocol: "https", headers: { cookie: "" }, get: () => "mailcraft.example" } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const describeSmtpIntegration = process.env.RUN_SMTP_INTEGRATION === "true" ? describe : describe.skip;

describeSmtpIntegration("renvoi SMTP depuis l’historique", () => {
  it("envoie un test, l’enregistre, puis le renvoie à la boîte SMTP configurée", async () => {
    const recipientEmail = process.env.SMTP_USER;
    expect(recipientEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    const caller = appRouter.createCaller(testContext());
    const initial = await caller.marketing.campaigns.sendTest({ recipientEmail: recipientEmail!, subject: "Validation MailCraft — email de test", previewText: "Vérification de l’historique et du renvoi", contentBlocks: [{ id: "validation-heading", type: "heading", content: "Validation de l’envoi de test", align: "left" }, { id: "validation-body", type: "text", content: "Cet email confirme le parcours MailCraft : envoi, historique et renvoi sécurisé.", align: "left" }] });
    expect(initial).toMatchObject({ sent: true });

    const history = await caller.marketing.settings.testEmails.list();
    const entry = history.find(item => item.subject === "Validation MailCraft — email de test");
    expect(entry).toBeDefined();

    const resent = await caller.marketing.settings.testEmails.resend({ id: entry!.id });
    expect(resent).toMatchObject({ sent: true });
  }, 30_000);
});
