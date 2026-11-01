import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function encryptionKey() {
  const source = process.env.SMTP_CREDENTIALS_ENCRYPTION_KEY;
  if (!source || source.trim().length < 32) throw new Error("La clé de chiffrement SMTP est absente ou trop courte.");
  return crypto.createHash("sha256").update(source, "utf8").digest();
}

export function encryptSmtpPassword(value: string) {
  if (!value) throw new Error("Le mot de passe SMTP est requis.");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSmtpPassword(payload: string) {
  const [version, ivValue, tagValue, ciphertextValue] = payload.split(".");
  if (version !== VERSION || !ivValue || !tagValue || !ciphertextValue) throw new Error("Le secret SMTP chiffré est invalide.");
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8");
}
