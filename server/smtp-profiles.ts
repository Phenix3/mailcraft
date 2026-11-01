import nodemailer from "nodemailer";
import { and, eq } from "drizzle-orm";
import { smtpProfiles } from "../drizzle/schema";
import { ensureOrganizationForUser, getDb } from "./db";
import { decryptSmtpPassword } from "./smtp-credentials";

export type SmtpTransportConfig = {
  id: number;
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string | null;
  replyTo: string | null;
};

export function smtpProfileView(profile: typeof smtpProfiles.$inferSelect) {
  return {
    id: profile.id,
    organizationId: profile.organizationId,
    name: profile.name,
    host: profile.host,
    port: profile.port,
    usernameHint: profile.username.replace(/^(.{2}).*(@.*)$/, "$1•••$2"),
    fromEmail: profile.fromEmail,
    fromName: profile.fromName,
    replyTo: profile.replyTo,
    status: profile.status,
    isActive: profile.isActive === 1,
    lastVerifiedAt: profile.lastVerifiedAt,
    lastError: profile.lastError,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export async function getSmtpProfileForUser(userId: number, profileId: number) {
  const db = await getDb();
  if (!db) throw new Error("La base de données est indisponible.");
  const organization = await ensureOrganizationForUser(userId);
  return (await db.select().from(smtpProfiles).where(and(eq(smtpProfiles.id, profileId), eq(smtpProfiles.organizationId, organization.id))).limit(1))[0];
}

export async function resolveSmtpTransportForUser(userId: number, requestedProfileId?: number | null, allowUnverified = false): Promise<SmtpTransportConfig> {
  const db = await getDb();
  if (!db) throw new Error("La base de données est indisponible.");
  const organization = await ensureOrganizationForUser(userId);
  const profile = requestedProfileId
    ? (await db.select().from(smtpProfiles).where(and(eq(smtpProfiles.id, requestedProfileId), eq(smtpProfiles.organizationId, organization.id))).limit(1))[0]
    : (await db.select().from(smtpProfiles).where(and(eq(smtpProfiles.organizationId, organization.id), eq(smtpProfiles.isActive, 1))).limit(1))[0];
  if (!profile) throw new Error("Aucun profil SMTP actif n’est configuré pour votre organisation.");
  if (!allowUnverified && profile.status !== "verified") throw new Error("Le profil SMTP sélectionné doit être vérifié avant un envoi.");
  return { id: profile.id, host: profile.host, port: profile.port, username: profile.username, password: decryptSmtpPassword(profile.encryptedPassword), fromEmail: profile.fromEmail, fromName: profile.fromName, replyTo: profile.replyTo };
}

export function createSmtpTransport(config: SmtpTransportConfig) {
  return nodemailer.createTransport({ host: config.host, port: config.port, secure: config.port === 465, auth: { user: config.username, pass: config.password } });
}

export async function verifySmtpTransportConfig(config: SmtpTransportConfig) {
  await createSmtpTransport(config).verify();
  return { verified: true };
}
