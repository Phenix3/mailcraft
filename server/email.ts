import crypto from "crypto";
import nodemailer from "nodemailer";
import { and, eq, inArray } from "drizzle-orm";
import { automationDeliveries, automationRules, campaignDeliveries, campaigns, segments, subscribers } from "../drizzle/schema";
import { getDb } from "./db";
import { createSmtpTransport, resolveSmtpTransportForUser } from "./smtp-profiles";

export type EmailBlock = {
  id: string;
  type: "heading" | "text" | "image" | "button" | "divider";
  content?: string;
  url?: string;
  alt?: string;
  align?: "left" | "center" | "right";
};

type SegmentCriteria = {
  tags?: string[];
  status?: "active" | "unsubscribed";
  registeredAfter?: number;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char);

export function defaultEmailBlocks(): EmailBlock[] {
  return [
    { id: "intro", type: "heading", content: "Votre prochaine actualité commence ici", align: "left" },
    { id: "body", type: "text", content: "Écrivez un message utile, clair et centré sur votre audience.", align: "left" },
    { id: "cta", type: "button", content: "Découvrir", url: "https://example.com", align: "left" },
  ];
}

export function safeBlocks(raw: string): EmailBlock[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultEmailBlocks();
    return parsed.filter((item): item is EmailBlock => item && typeof item.id === "string" && ["heading", "text", "image", "button", "divider"].includes(item.type));
  } catch {
    return defaultEmailBlocks();
  }
}

export function renderEmailHtml(blocks: EmailBlock[], tracking: { campaignId: number; subscriberId: number; baseUrl: string }) {
  const content = blocks.map(block => {
    const align = block.align ?? "left";
    if (block.type === "heading") return `<h1 style="margin:0 0 18px;color:#232121;font:700 28px/1.2 Arial,sans-serif;text-align:${align}">${escapeHtml(block.content ?? "")}</h1>`;
    if (block.type === "text") return `<p style="margin:0 0 20px;color:#4c4846;font:400 16px/1.6 Arial,sans-serif;text-align:${align}">${escapeHtml(block.content ?? "").replace(/\n/g, "<br />")}</p>`;
    if (block.type === "divider") return `<hr style="border:0;border-top:1px solid #eee8e6;margin:28px 0" />`;
    if (block.type === "image") {
      const url = safeHttpUrl(block.url) ?? "";
      return url ? `<div style="margin:0 0 22px;text-align:${align}"><img src="${escapeHtml(url)}" alt="${escapeHtml(block.alt ?? "Image de campagne")}" style="max-width:100%;border-radius:12px;display:inline-block" /></div>` : "";
    }
    if (block.type === "button") {
      const destination = safeHttpUrl(block.url) ?? "https://example.com";
      const tracked = `${tracking.baseUrl}/t/click/${tracking.campaignId}/${tracking.subscriberId}?url=${encodeURIComponent(destination)}`;
      return `<div style="margin:4px 0 24px;text-align:${align}"><a href="${escapeHtml(tracked)}" style="display:inline-block;background:#ed7664;color:#fff;text-decoration:none;padding:13px 20px;border-radius:8px;font:600 15px Arial,sans-serif">${escapeHtml(block.content ?? "En savoir plus")}</a></div>`;
    }
    return "";
  }).join("");
  const unsubscribe = createUnsubscribeUrl(tracking.campaignId, tracking.subscriberId, tracking.baseUrl);
  const pixel = `${tracking.baseUrl}/t/open/${tracking.campaignId}/${tracking.subscriberId}.gif`;
  return `<!doctype html><html><body style="margin:0;background:#f7f5f4;padding:32px 12px"><main style="max-width:620px;margin:0 auto;background:#fff;padding:42px;border-radius:18px">${content}<p style="margin:32px 0 0;color:#88817e;font:12px/1.5 Arial,sans-serif">Vous recevez cet email car vous êtes inscrit(e) à notre liste. <a href="${escapeHtml(unsubscribe)}" style="color:#b95a4c">Se désabonner</a></p></main><img src="${escapeHtml(pixel)}" width="1" height="1" alt="" /></body></html>`;
}

export function renderTestEmailHtml(blocks: EmailBlock[]) {
  const content = blocks.map(block => {
    const align = block.align ?? "left";
    if (block.type === "heading") return `<h1 style="margin:0 0 18px;color:#232121;font:700 28px/1.2 Arial,sans-serif;text-align:${align}">${escapeHtml(block.content ?? "")}</h1>`;
    if (block.type === "text") return `<p style="margin:0 0 20px;color:#4c4846;font:400 16px/1.6 Arial,sans-serif;text-align:${align}">${escapeHtml(block.content ?? "").replace(/\n/g, "<br />")}</p>`;
    if (block.type === "divider") return `<hr style="border:0;border-top:1px solid #eee8e6;margin:28px 0" />`;
    if (block.type === "image") { const url = safeHttpUrl(block.url) ?? ""; return url ? `<div style="margin:0 0 22px;text-align:${align}"><img src="${escapeHtml(url)}" alt="${escapeHtml(block.alt ?? "Image de campagne")}" style="max-width:100%;border-radius:12px;display:inline-block" /></div>` : ""; }
    if (block.type === "button") { const destination = safeHttpUrl(block.url) ?? "https://example.com"; return `<div style="margin:4px 0 24px;text-align:${align}"><a href="${escapeHtml(destination)}" style="display:inline-block;background:#ed7664;color:#fff;text-decoration:none;padding:13px 20px;border-radius:8px;font:600 15px Arial,sans-serif">${escapeHtml(block.content ?? "En savoir plus")}</a></div>`; }
    return "";
  }).join("");
  return `<!doctype html><html><body style="margin:0;background:#f7f5f4;padding:32px 12px"><main style="max-width:620px;margin:0 auto;background:#fff;padding:42px;border-radius:18px">${content}<p style="margin:32px 0 0;color:#88817e;font:12px/1.5 Arial,sans-serif">Ceci est un email de test MailCraft. Aucun suivi, aucune métrique et aucun désabonnement ne sont associés à cet envoi.</p></main></body></html>`;
}

function safeHttpUrl(url?: string) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null;
  } catch { return null; }
}

export function createUnsubscribeToken(campaignId: number, subscriberId: number) {
  return crypto.createHmac("sha256", process.env.JWT_SECRET ?? "mailcraft-local-secret").update(`${campaignId}:${subscriberId}`).digest("hex");
}

export function createUnsubscribeUrl(campaignId: number, subscriberId: number, baseUrl: string) {
  return `${baseUrl}/unsubscribe?c=${campaignId}&s=${subscriberId}&t=${createUnsubscribeToken(campaignId, subscriberId)}`;
}

export function isValidUnsubscribeToken(campaignId: number, subscriberId: number, token: string) {
  const expected = createUnsubscribeToken(campaignId, subscriberId);
  return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function buildCronExpression(scheduledFor: number) {
  const date = new Date(scheduledFor);
  return `0 ${date.getUTCMinutes()} ${date.getUTCHours()} ${date.getUTCDate()} ${date.getUTCMonth() + 1} *`;
}

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  if (!host || !user || !pass || !from || !Number.isInteger(port)) throw new Error("La configuration SMTP est incomplète. Renseignez SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS et SMTP_FROM.");
  return { host, port, user, pass, from };
}

export function getSmtpConfigurationStatus() {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"] as const;
  const missing = required.filter(key => !process.env[key]);
  return { configured: missing.length === 0, missing };
}

export async function verifySmtpTransport() {
  const config = smtpConfig();
  const transporter = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.port === 465, auth: { user: config.user, pass: config.pass } });
  await transporter.verify();
  return { verified: true };
}

export async function sendTestEmail(input: { userId: number; smtpProfileId?: number | null; recipientEmail: string; subject: string; previewText?: string; blocks: EmailBlock[]; baseUrl: string }) {
  if (!EMAIL_RE.test(input.recipientEmail)) throw new Error("L’adresse de test est invalide.");
  const config = await resolveSmtpTransportForUser(input.userId, input.smtpProfileId);
  const transporter = createSmtpTransport(config);
  const html = renderTestEmailHtml(input.blocks);
  await transporter.sendMail({ from: fromAddress(config.fromEmail, config.fromName), replyTo: config.replyTo || undefined, to: input.recipientEmail.trim().toLowerCase(), subject: `[Test] ${input.subject || "Votre email MailCraft"}`, html, text: `Email de test MailCraft — ${input.previewText || "Pré-en-tête non renseigné"}`, headers: { "X-MailCraft-Email-Type": "test" } });
  return { sent: true, smtpProfileId: config.id };
}

function fromAddress(from: string, fromName?: string | null) {
  if (!fromName?.trim()) return from;
  const email = /<([^>]+)>/.exec(from)?.[1] ?? from;
  return `"${fromName.replace(/["\\]/g, "")}" <${email}>`;
}

export function parseSubscribersCsv(csv: string) {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map(value => value.toLowerCase().trim());
  const emailIndex = headers.indexOf("email");
  if (emailIndex === -1) throw new Error("Le fichier CSV doit contenir une colonne email.");
  return lines.slice(1).map(splitCsvLine).map(values => ({
    email: (values[emailIndex] ?? "").trim().toLowerCase(),
    firstName: (values[headers.indexOf("first_name")] ?? values[headers.indexOf("firstname")] ?? "").trim(),
    lastName: (values[headers.indexOf("last_name")] ?? values[headers.indexOf("lastname")] ?? "").trim(),
    tags: (values[headers.indexOf("tags")] ?? "").split(/[|,;]/).map(tag => tag.trim()).filter(Boolean),
  })).filter(row => EMAIL_RE.test(row.email));
}

function splitCsvLine(line: string) {
  const result: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') { value += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { result.push(value); value = ""; }
    else value += char;
  }
  result.push(value);
  return result;
}

export async function sendCampaignEmails(campaignId: number, baseUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("La base de données est indisponible.");
  const campaign = (await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1))[0];
  if (!campaign) throw new Error("Campagne introuvable.");
  if (campaign.status === "sent") return { skipped: "already_sent", sent: campaign.sentCount, failed: 0 };
  if (campaign.status === "sending") return { skipped: "already_sending", sent: campaign.sentCount, failed: 0 };
  const config = await resolveSmtpTransportForUser(campaign.userId, campaign.smtpProfileId);
  await db.update(campaigns).set({ status: "sending", updatedAt: Date.now() }).where(eq(campaigns.id, campaignId));
  const candidates = await db.select().from(subscribers).where(and(eq(subscribers.userId, campaign.userId), eq(subscribers.status, "active")));
  let criteria: SegmentCriteria = {};
  if (campaign.targetSegmentId) {
    const segment = (await db.select().from(segments).where(and(eq(segments.id, campaign.targetSegmentId), eq(segments.userId, campaign.userId))).limit(1))[0];
    if (segment) { try { criteria = JSON.parse(segment.criteria) as SegmentCriteria; } catch { criteria = {}; } }
  }
  const recipients = candidates.filter(subscriber => {
    const tags = JSON.parse(subscriber.tags) as string[];
    const tagMatch = !criteria.tags?.length || criteria.tags.every(tag => tags.includes(tag));
    return tagMatch && (!criteria.registeredAfter || subscriber.createdAt >= criteria.registeredAfter) && (!criteria.status || criteria.status === subscriber.status);
  });
  const transporter = createSmtpTransport(config);
  let sent = 0;
  let failed = 0;
  const blocks = safeBlocks(campaign.contentBlocks);
  for (const recipient of recipients) {
    const now = Date.now();
    try {
      const html = renderEmailHtml(blocks, { campaignId, subscriberId: recipient.id, baseUrl });
      await transporter.sendMail({ from: fromAddress(config.fromEmail, config.fromName), replyTo: config.replyTo || undefined, to: recipient.email, subject: campaign.subject, html, text: "Consultez cet email dans un client compatible HTML.", headers: { "List-Unsubscribe": `<${createUnsubscribeUrl(campaignId, recipient.id, baseUrl)}>` } });
      await db.insert(campaignDeliveries).values({ campaignId, subscriberId: recipient.id, recipientEmail: recipient.email, status: "sent", sentAt: now }).onDuplicateKeyUpdate({ set: { status: "sent", sentAt: now, errorMessage: null } });
      sent += 1;
    } catch (error) {
      await db.insert(campaignDeliveries).values({ campaignId, subscriberId: recipient.id, recipientEmail: recipient.email, status: "failed", errorMessage: String(error).slice(0, 1000) }).onDuplicateKeyUpdate({ set: { status: "failed", errorMessage: String(error).slice(0, 1000) } });
      failed += 1;
    }
  }
  const now = Date.now();
  await db.update(campaigns).set({ status: "sent", sentAt: now, sentCount: sent, updatedAt: now }).where(eq(campaigns.id, campaignId));
  return { sent, failed };
}

function parseCriteria(raw: string): SegmentCriteria {
  try { return JSON.parse(raw) as SegmentCriteria; } catch { return {}; }
}

function matchesSegment(subscriber: typeof subscribers.$inferSelect, criteria: SegmentCriteria) {
  let tags: string[] = [];
  try { tags = JSON.parse(subscriber.tags) as string[]; } catch { tags = []; }
  const tagMatch = !criteria.tags?.length || criteria.tags.every(tag => tags.includes(tag));
  return subscriber.status === "active" && tagMatch && (!criteria.status || criteria.status === subscriber.status) && (!criteria.registeredAfter || subscriber.createdAt >= criteria.registeredAfter);
}

export function isAutomationRecipientEligible(input: {
  subscriberCreatedAt: number;
  subscriberStatus: "active" | "unsubscribed" | "bounced";
  activatedAt: number | null;
  delayMinutes: number;
  alreadyDelivered: boolean;
  now: number;
}) {
  const activationCutoff = input.activatedAt ?? input.now;
  const availableBefore = input.now - input.delayMinutes * 60_000;
  return input.subscriberStatus === "active" && !input.alreadyDelivered && input.subscriberCreatedAt >= activationCutoff && input.subscriberCreatedAt <= availableBefore;
}

export async function sendAutomationEmails(automationRuleId: number, baseUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("La base de données est indisponible.");
  const rule = (await db.select().from(automationRules).where(eq(automationRules.id, automationRuleId)).limit(1))[0];
  if (!rule) throw new Error("Auto-répondeur introuvable.");
  if (rule.status !== "active") return { skipped: "paused", sent: 0, failed: 0 };
  const config = await resolveSmtpTransportForUser(rule.userId, rule.smtpProfileId);
  const audience = await db.select().from(subscribers).where(and(eq(subscribers.userId, rule.userId), eq(subscribers.status, "active")));
  const priorDeliveries = await db.select().from(automationDeliveries).where(eq(automationDeliveries.automationRuleId, rule.id));
  const deliveredSubscriberIds = new Set(priorDeliveries.filter(delivery => delivery.status === "sent").map(delivery => delivery.subscriberId));
  let criteria: SegmentCriteria = {};
  if (rule.targetSegmentId) {
    const segment = (await db.select().from(segments).where(and(eq(segments.id, rule.targetSegmentId), eq(segments.userId, rule.userId))).limit(1))[0];
    if (segment) criteria = parseCriteria(segment.criteria);
  }
  const currentTime = Date.now();
  const recipients = audience.filter(subscriber => isAutomationRecipientEligible({ subscriberCreatedAt: subscriber.createdAt, subscriberStatus: subscriber.status, activatedAt: rule.activatedAt, delayMinutes: rule.delayMinutes, alreadyDelivered: deliveredSubscriberIds.has(subscriber.id), now: currentTime }) && matchesSegment(subscriber, criteria));
  const transporter = createSmtpTransport(config);
  const blocks = safeBlocks(rule.contentBlocks);
  let sent = 0;
  let failed = 0;
  for (const recipient of recipients) {
    const timestamp = Date.now();
    try {
      const html = renderEmailHtml(blocks, { campaignId: 0, subscriberId: recipient.id, baseUrl });
      await transporter.sendMail({ from: fromAddress(config.fromEmail, config.fromName), replyTo: config.replyTo || undefined, to: recipient.email, subject: rule.subject, html, text: "Consultez cet email dans un client compatible HTML.", headers: { "List-Unsubscribe": `<${createUnsubscribeUrl(0, recipient.id, baseUrl)}>` } });
      await db.insert(automationDeliveries).values({ automationRuleId: rule.id, subscriberId: recipient.id, recipientEmail: recipient.email, status: "sent", sentAt: timestamp }).onDuplicateKeyUpdate({ set: { status: "sent", sentAt: timestamp, errorMessage: null } });
      sent += 1;
    } catch (error) {
      await db.insert(automationDeliveries).values({ automationRuleId: rule.id, subscriberId: recipient.id, recipientEmail: recipient.email, status: "failed", errorMessage: String(error).slice(0, 1000) }).onDuplicateKeyUpdate({ set: { status: "failed", errorMessage: String(error).slice(0, 1000) } });
      failed += 1;
    }
  }
  return { sent, failed };
}
