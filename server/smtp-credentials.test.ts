import { describe, expect, it } from "vitest";
import { decryptSmtpPassword, encryptSmtpPassword } from "./smtp-credentials";

describe("smtp credential encryption", () => {
  it("uses the configured SMTP_CREDENTIALS_ENCRYPTION_KEY to encrypt and decrypt a credential", () => {
    expect(process.env.SMTP_CREDENTIALS_ENCRYPTION_KEY).toBeTruthy();
    const encrypted = encryptSmtpPassword("mot-de-passe-de-test");
    expect(encrypted).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(encrypted).not.toContain("mot-de-passe-de-test");
    expect(decryptSmtpPassword(encrypted)).toBe("mot-de-passe-de-test");
  });
});
