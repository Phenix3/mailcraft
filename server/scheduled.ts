import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import {
  recordEmailClick,
  recordEmailOpen,
  registerBounce,
  unsubscribeSubscriber,
} from "./db";
import {
  isValidUnsubscribeToken,
  sendCampaignEmails,
  sendAutomationEmails,
} from "./email";

const trackingPixel = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
  "base64"
);

function requestBaseUrl(req: Request) {
  return `${req.protocol}://${req.get("host")}`;
}

/**
 * Internal scheduler / ops endpoints. They no longer trust a cron JWT from an
 * external service: callers must present `x-mailcraft-scheduler-secret`
 * matching the SCHEDULER_SECRET env var.
 */
function verifySchedulerSecret(req: Request): boolean {
  const expected = ENV.schedulerSecret;
  const supplied = req.header("x-mailcraft-scheduler-secret");
  return Boolean(expected && supplied && supplied === expected);
}

export function registerCampaignPublicRoutes(app: Express) {
  app.post("/api/webhooks/smtp-bounce", async (req, res) => {
    const expectedSecret = ENV.bounceWebhookSecret;
    const suppliedSecret = req.header("x-mailcraft-webhook-secret");
    if (!expectedSecret || !suppliedSecret || suppliedSecret !== expectedSecret)
      return res.status(401).json({ error: "invalid_webhook_secret" });
    const body = req.body as Record<string, unknown>;
    const userId = Number(body.userId);
    const recipientEmail =
      typeof body.recipientEmail === "string" ? body.recipientEmail : "";
    const type =
      body.type === "hard" || body.type === "soft" ? body.type : null;
    if (!Number.isInteger(userId) || userId <= 0 || !recipientEmail || !type)
      return res.status(400).json({ error: "invalid_bounce_payload" });
    try {
      const result = await registerBounce({
        userId,
        recipientEmail,
        type,
        reason: typeof body.reason === "string" ? body.reason : undefined,
        providerEventId:
          typeof body.providerEventId === "string"
            ? body.providerEventId
            : undefined,
        occurredAt:
          typeof body.occurredAt === "number" ? body.occurredAt : undefined,
      });
      return res.status(200).json({ ok: true, ...result });
    } catch (error) {
      return res
        .status(500)
        .json({ error: String(error), timestamp: Date.now() });
    }
  });

  app.post("/api/scheduled/send-campaign", async (req, res) => {
    if (!verifySchedulerSecret(req))
      return res.status(403).json({ error: "scheduler-secret-required" });
    const campaignId = Number((req.body as Record<string, unknown>).campaignId);
    if (!Number.isInteger(campaignId) || campaignId <= 0)
      return res.status(400).json({ error: "invalid_campaign_id" });
    try {
      const result = await sendCampaignEmails(campaignId, requestBaseUrl(req));
      return res.json({ ok: true, campaignId, result });
    } catch (error) {
      return res
        .status(500)
        .json({
          error: String(error),
          timestamp: Date.now(),
          context: { path: req.path },
        });
    }
  });

  app.post("/api/scheduled/run-automation", async (req, res) => {
    if (!verifySchedulerSecret(req))
      return res.status(403).json({ error: "scheduler-secret-required" });
    const automationRuleId = Number(
      (req.body as Record<string, unknown>).automationRuleId
    );
    if (!Number.isInteger(automationRuleId) || automationRuleId <= 0)
      return res.status(400).json({ error: "invalid_automation_id" });
    try {
      const result = await sendAutomationEmails(
        automationRuleId,
        requestBaseUrl(req)
      );
      return res.json({ ok: true, automationId: automationRuleId, result });
    } catch (error) {
      return res
        .status(500)
        .json({
          error: String(error),
          timestamp: Date.now(),
          context: { path: req.path },
        });
    }
  });

  app.get("/t/open/:campaignId/:subscriberId.gif", async (req, res) => {
    try {
      await recordEmailOpen(
        Number(req.params.campaignId),
        Number(req.params.subscriberId)
      );
    } catch (error) {
      console.warn("[Tracking] open failed", error);
    }
    res.set({
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    });
    return res.status(200).send(trackingPixel);
  });

  app.get("/t/click/:campaignId/:subscriberId", async (req, res) => {
    const destination = typeof req.query.url === "string" ? req.query.url : "";
    try {
      await recordEmailClick(
        Number(req.params.campaignId),
        Number(req.params.subscriberId)
      );
    } catch (error) {
      console.warn("[Tracking] click failed", error);
    }
    try {
      const parsed = new URL(destination);
      if (["http:", "https:"].includes(parsed.protocol))
        return res.redirect(parsed.toString());
    } catch {
      /* invalid destination */
    }
    return res.status(400).send("Lien de redirection invalide.");
  });

  app.get("/unsubscribe", async (req, res) => {
    const campaignId = Number(req.query.c);
    const subscriberId = Number(req.query.s);
    const token = typeof req.query.t === "string" ? req.query.t : "";
    if (
      !Number.isInteger(campaignId) ||
      !Number.isInteger(subscriberId) ||
      !isValidUnsubscribeToken(campaignId, subscriberId, token)
    )
      return res.status(400).send("Lien de désabonnement invalide.");
    const updated = await unsubscribeSubscriber(subscriberId);
    return res
      .status(updated ? 200 : 404)
      .send(
        `<!doctype html><html lang="fr"><body style="font-family:Arial,sans-serif;background:#f7f5f4;color:#242121;display:grid;place-items:center;min-height:100vh;margin:0"><main style="background:#fff;border-radius:18px;padding:42px;max-width:480px;text-align:center"><p style="color:#e46f5e;font-weight:700;margin:0 0 12px">MailCraft</p><h1>Vous êtes désabonné(e).</h1><p>Votre préférence a été mise à jour. Vous ne recevrez plus les prochains emails de cette liste.</p></main></body></html>`
      );
  });
}
