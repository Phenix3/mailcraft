import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { marketingRouter } from "./routers/marketing";

describe("contrat multi-SMTP", () => {
  it("expose les profils SMTP d’organisation sans conserver le routeur SMTP global historique", () => {
    const procedures = marketingRouter._def.procedures;
    expect(procedures["smtpProfiles.list"]).toBeDefined();
    expect(procedures["admin.smtp.get"]).toBeUndefined();
  });

  it("migre les réglages historiques de tous les propriétaires concernés et reste idempotente", () => {
    const script = readFileSync(resolve(process.cwd(), "server/migrate-legacy-smtp.mjs"), "utf8");
    expect(script).toContain("s.userId IS NOT NULL OR u.role = 'admin'");
    expect(script).toContain("SELECT id FROM smtpProfiles WHERE organizationId = ? LIMIT 1");
    expect(script).not.toContain("WHERE u.role = 'admin'");
  });
});
