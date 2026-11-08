import { and, eq, lte } from "drizzle-orm";
import { Cron } from "croner";
import { automationRules, campaigns } from "../drizzle/schema";
import { getDb } from "./db";
import { sendAutomationEmails, sendCampaignEmails } from "./email";

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type DbLoader<T> = (db: Database) => Promise<T[]>;

/**
 * Self-contained scheduler: replaces the external "heartbeat" cron service.
 * Every tick re-reads the database, so any schedule created, updated or
 * cancelled through the app takes effect on the next tick — no jobs registry.
 */
export class MailcraftScheduler {
  private campaignJob?: Cron;
  private automationJob?: Cron;
  private campaignRun: Promise<void> = Promise.resolve();
  private automationRun: Promise<void> = Promise.resolve();

  /** Send campaigns whose `scheduledFor` has passed while still "scheduled". */
  tickCampaigns(baseUrl: string): Promise<void> {
    this.campaignRun = this.campaignRun.then(() =>
      this.runTick(
        async db => {
          const now = Date.now();
          return db
            .select()
            .from(campaigns)
            .where(
              and(
                eq(campaigns.status, "scheduled"),
                lte(campaigns.scheduledFor, now)
              )
            );
        },
        campaign => sendCampaignEmails(campaign.id, baseUrl),
        "campaign",
        "orphan"
      )
    );
    return this.campaignRun;
  }

  /** Run every active automation rule (eligibility is computed by email.ts). */
  tickAutomations(baseUrl: string): Promise<void> {
    this.automationRun = this.automationRun.then(() =>
      this.runTick(
        async db =>
          db
            .select()
            .from(automationRules)
            .where(eq(automationRules.status, "active")),
        rule => sendAutomationEmails(rule.id, baseUrl),
        "automation rule",
        "missing"
      )
    );
    return this.automationRun;
  }

  start(baseUrl: string) {
    // Campaigns fire at a precise `scheduledFor` timestamp; a 30s tick is enough.
    this.campaignJob = new Cron("0 */30 * * * *", () =>
      this.tickCampaigns(baseUrl)
    );
    // Automations keep the original 5-minute cadence.
    this.automationJob = new Cron("0 */5 * * * *", () =>
      this.tickAutomations(baseUrl)
    );
    console.log(
      "[Scheduler] Started (campaigns every 30s, automations every 5min)."
    );
  }

  stop() {
    this.campaignJob?.stop();
    this.automationJob?.stop();
  }

  private async runTick<T extends { id: number }>(
    load: DbLoader<T>,
    run: (item: T) => Promise<unknown>,
    label: string,
    skippedLabel: string
  ) {
    const db = await getDb();
    if (!db) return;
    let items: T[] = [];
    try {
      items = await load(db);
    } catch (error) {
      console.error(`[Scheduler] Failed to load ${label} ticks:`, error);
      return;
    }
    for (const item of items) {
      try {
        const result = (await run(item)) as { skipped?: string };
        console.log(
          `[Scheduler] ${label} #${item.id}: ${result?.skipped ? `skipped (${skippedLabel})` : "done"}`
        );
      } catch (error) {
        console.error(`[Scheduler] ${label} #${item.id} failed:`, error);
      }
    }
  }
}
