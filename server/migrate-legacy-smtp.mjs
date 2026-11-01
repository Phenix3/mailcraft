import crypto from "node:crypto";
import mysql from "mysql2/promise";

const required = ["DATABASE_URL", "SMTP_CREDENTIALS_ENCRYPTION_KEY", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
const missing = required.filter(key => !process.env[key]);
if (missing.length) throw new Error(`Variables manquantes : ${missing.join(", ")}`);

function encrypt(value) {
  const key = crypto.createHash("sha256").update(process.env.SMTP_CREDENTIALS_ENCRYPTION_KEY, "utf8").digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function fromEmail(value) {
  return /<([^>]+)>/.exec(value)?.[1]?.trim().toLowerCase() || value.trim().toLowerCase();
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const [legacyRows] = await connection.query("SELECT u.id AS userId, s.fromName, s.replyTo, o.id AS organizationId FROM users u INNER JOIN organizations o ON o.ownerUserId = u.id LEFT JOIN smtpSettings s ON s.userId = u.id WHERE s.userId IS NOT NULL OR u.role = 'admin'");
  let migrated = 0;
  for (const legacy of legacyRows) {
    const [existing] = await connection.query("SELECT id FROM smtpProfiles WHERE organizationId = ? LIMIT 1", [legacy.organizationId]);
    if (existing.length) continue;
    const timestamp = Date.now();
    await connection.query("INSERT INTO smtpProfiles (organizationId, name, host, port, username, encryptedPassword, fromEmail, fromName, replyTo, status, isActive, lastVerifiedAt, lastError, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', 1, ?, NULL, ?, ?)", [legacy.organizationId, "SMTP historique MailCraft", process.env.SMTP_HOST, Number(process.env.SMTP_PORT), process.env.SMTP_USER, encrypt(process.env.SMTP_PASS), fromEmail(process.env.SMTP_FROM), legacy.fromName || null, legacy.replyTo || null, timestamp, timestamp, timestamp]);
    migrated += 1;
  }
  console.log(JSON.stringify({ migrated }));
} finally {
  connection.destroy();
}
