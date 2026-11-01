import { describe, expect, it } from "vitest";
import { smtpProfileView } from "./smtp-profiles";

describe("smtp profile view", () => {
  it("masque les secrets et le nom d’utilisateur complet avant tout retour au navigateur", () => {
    const view = smtpProfileView({ id: 7, organizationId: 3, name: "Marketing", host: "smtp.example.com", port: 587, username: "contact@example.com", encryptedPassword: "v1.secret.encrypted", fromEmail: "contact@example.com", fromName: "Marque", replyTo: "reponse@example.com", status: "verified", isActive: 1, lastVerifiedAt: 123, lastError: null, createdAt: 100, updatedAt: 123 } as any);
    expect(view).toMatchObject({ id: 7, organizationId: 3, status: "verified", isActive: true, usernameHint: "co•••@example.com" });
    expect(view).not.toHaveProperty("encryptedPassword");
    expect(view).not.toHaveProperty("username");
  });
});
