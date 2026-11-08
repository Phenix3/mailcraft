import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

const describeAiIntegration = process.env.RUN_LLM_INTEGRATION === "true" ? describe : describe.skip;

function aiContext(): TrpcContext {
  const timestamp = new Date();
  return {
    user: { id: 1, openId: "ai-integration", name: "AI integration", email: "ai@example.test", loginMethod: "password", role: "user", createdAt: timestamp, updatedAt: timestamp, lastSignedIn: timestamp },
    req: { protocol: "https", headers: {}, get: () => "mailcraft.example" } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describeAiIntegration("assistant IA réel", () => {
  it("retourne une suggestion structurée interprétable pour une campagne", async () => {
    const caller = appRouter.createCaller(aiContext());
    const suggestion = await caller.marketing.ai.emailAssistant({ task: "optimize_subject", language: "français", tone: "professionnel", brandTone: "sobre", objective: "Présenter une amélioration produit avec clarté", subject: "Une nouvelle fonctionnalité", previewText: "Découvrez ce qui change", blocks: [{ id: "body", type: "text", content: "Nous avons amélioré votre espace de campagne." }] });
    expect(suggestion).toMatchObject({ model: expect.any(String), subject: expect.any(String), previewText: expect.any(String), heading: expect.any(String), body: expect.any(String), ctaLabel: expect.any(String), rationale: expect.any(String) });
  }, 45_000);
});
