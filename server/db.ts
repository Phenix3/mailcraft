import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  bounceEvents,
  automationRules,
  campaignDeliveries,
  campaigns,
  consentEvents,
  InsertUser,
  organizationMembers,
  organizations,
  subscribers,
  User,
  users,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function ensureDbOrThrow() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db;
}

export async function createUser(user: InsertUser): Promise<void> {
  const db = await ensureDbOrThrow();
  await db.insert(users).values(user);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return rows[0];
}

export async function countUsers(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ id: users.id }).from(users);
  return rows.length;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await ensureDbOrThrow();

  const values: InsertUser = {
    openId: user.openId,
    lastSignedIn: user.lastSignedIn ?? new Date(),
  };
  const updateSet: Record<string, unknown> = {
    lastSignedIn: values.lastSignedIn,
  };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }
  await db
    .insert(users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(
  openId: string
): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result[0];
}

export async function ensureOrganizationForUser(
  userId: number,
  displayName?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const current = (
    await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerUserId, userId))
      .limit(1)
  )[0];
  if (current) return current;
  const timestamp = Date.now();
  await db
    .insert(organizations)
    .values({
      name: displayName?.trim().slice(0, 160) || "Espace MailCraft",
      ownerUserId: userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  const created = (
    await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerUserId, userId))
      .limit(1)
  )[0];
  if (!created) throw new Error("Unable to create organization");
  await db
    .insert(organizationMembers)
    .values({
      organizationId: created.id,
      userId,
      role: "owner",
      createdAt: timestamp,
    })
    .onDuplicateKeyUpdate({ set: { role: "owner" } });
  return created;
}

export async function getCampaignByScheduleTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.scheduleCronTaskUid, taskUid))
    .limit(1);
  return result[0];
}

export async function getAutomationByScheduleTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(automationRules)
    .where(eq(automationRules.scheduleCronTaskUid, taskUid))
    .limit(1);
  return result[0];
}

export async function recordEmailOpen(
  campaignId: number,
  subscriberId: number
) {
  const db = await getDb();
  if (!db) return;
  const delivery = await db
    .select()
    .from(campaignDeliveries)
    .where(
      and(
        eq(campaignDeliveries.campaignId, campaignId),
        eq(campaignDeliveries.subscriberId, subscriberId)
      )
    )
    .limit(1);
  if (!delivery[0] || delivery[0].openedAt) return;
  const now = Date.now();
  await db
    .update(campaignDeliveries)
    .set({ openedAt: now })
    .where(eq(campaignDeliveries.id, delivery[0].id));
  await db
    .update(campaigns)
    .set({
      openCount: await countCampaignEvents(campaignId, "openedAt"),
      updatedAt: now,
    })
    .where(eq(campaigns.id, campaignId));
}

export async function recordEmailClick(
  campaignId: number,
  subscriberId: number
) {
  const db = await getDb();
  if (!db) return;
  const delivery = await db
    .select()
    .from(campaignDeliveries)
    .where(
      and(
        eq(campaignDeliveries.campaignId, campaignId),
        eq(campaignDeliveries.subscriberId, subscriberId)
      )
    )
    .limit(1);
  if (!delivery[0] || delivery[0].clickedAt) return;
  const now = Date.now();
  await db
    .update(campaignDeliveries)
    .set({ clickedAt: now })
    .where(eq(campaignDeliveries.id, delivery[0].id));
  await db
    .update(campaigns)
    .set({
      clickCount: await countCampaignEvents(campaignId, "clickedAt"),
      updatedAt: now,
    })
    .where(eq(campaigns.id, campaignId));
}

async function countCampaignEvents(
  campaignId: number,
  field: "openedAt" | "clickedAt"
) {
  const db = await getDb();
  if (!db) return 0;
  const deliveries = await db
    .select()
    .from(campaignDeliveries)
    .where(eq(campaignDeliveries.campaignId, campaignId));
  return deliveries.filter(delivery => delivery[field] !== null).length;
}

export async function unsubscribeSubscriber(subscriberId: number) {
  const db = await getDb();
  if (!db) return false;
  const subscriber = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.id, subscriberId))
    .limit(1);
  if (!subscriber[0]) return false;
  if (subscriber[0].status === "unsubscribed") return true;
  const now = Date.now();
  await db
    .update(subscribers)
    .set({ status: "unsubscribed", unsubscribedAt: now })
    .where(eq(subscribers.id, subscriberId));
  await db
    .insert(consentEvents)
    .values({
      userId: subscriber[0].userId,
      subscriberId,
      action: "withdrawn",
      basis: "consent",
      source: "unsubscribe_link",
      proof: null,
      capturedAt: now,
    });
  const deliveries = await db
    .select()
    .from(campaignDeliveries)
    .where(eq(campaignDeliveries.subscriberId, subscriberId));
  for (const delivery of deliveries) {
    if (delivery.unsubscribedAt) continue;
    await db
      .update(campaignDeliveries)
      .set({ unsubscribedAt: now })
      .where(eq(campaignDeliveries.id, delivery.id));
    const count = await countCampaignEvents(delivery.campaignId, "openedAt");
    void count;
    const allDeliveries = await db
      .select()
      .from(campaignDeliveries)
      .where(eq(campaignDeliveries.campaignId, delivery.campaignId));
    await db
      .update(campaigns)
      .set({
        unsubscribeCount: allDeliveries.filter(
          item => item.unsubscribedAt !== null
        ).length,
        updatedAt: now,
      })
      .where(eq(campaigns.id, delivery.campaignId));
  }
  return true;
}

export async function registerBounce(input: {
  userId: number;
  recipientEmail: string;
  type: "hard" | "soft";
  reason?: string;
  providerEventId?: string;
  occurredAt?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const recipientEmail = input.recipientEmail.trim().toLowerCase();
  const subscriber = (
    await db
      .select()
      .from(subscribers)
      .where(
        and(
          eq(subscribers.userId, input.userId),
          eq(subscribers.email, recipientEmail)
        )
      )
      .limit(1)
  )[0];
  const timestamp = input.occurredAt ?? Date.now();
  await db
    .insert(bounceEvents)
    .values({
      userId: input.userId,
      subscriberId: subscriber?.id ?? null,
      recipientEmail,
      type: input.type,
      providerEventId: input.providerEventId || null,
      reason: input.reason || null,
      occurredAt: timestamp,
      processedAt: Date.now(),
    })
    .onDuplicateKeyUpdate({
      set: {
        reason: input.reason || null,
        occurredAt: timestamp,
        processedAt: Date.now(),
      },
    });
  if (
    subscriber &&
    shouldSuppressAfterBounce(input.type) &&
    subscriber.status !== "bounced"
  ) {
    await db
      .update(subscribers)
      .set({ status: "bounced" })
      .where(eq(subscribers.id, subscriber.id));
  }
  return {
    subscriberId: subscriber?.id ?? null,
    suppressed: Boolean(subscriber && shouldSuppressAfterBounce(input.type)),
  };
}

export function shouldSuppressAfterBounce(type: "hard" | "soft") {
  return type === "hard";
}
