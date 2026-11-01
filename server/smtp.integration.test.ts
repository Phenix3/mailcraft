import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

function adminContext(): TrpcContext {
  const timestamp = new Date();
  return {
    user: { id: 1, openId: "smtp-integration", name: "SMTP integration", email: "smtp@example.test", loginMethod: "manus", role: "admin", createdAt: timestamp, updatedAt: timestamp, lastSignedIn: timestamp },
    req: { protocol: "https", headers: {}, get: () => "mailcraft.example" } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

const describeSmtpIntegration = process.env.RUN_SMTP_INTEGRATION === "true" ? describe : describe.skip;

describeSmtpIntegration("SMTP configuré", () => {
  it("vérifie le transport côté serveur sans exposer les secrets", async () => {
    const caller = appRouter.createCaller(adminContext());
    await expect(caller.marketing.admin.smtp.testTransport()).resolves.toEqual({ verified: true });
  }, 20_000);
});
