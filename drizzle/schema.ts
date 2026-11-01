import {
  bigint,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const organizationRole = ["owner", "member"] as const;
export const smtpProfileStatus = ["draft", "verified", "failed"] as const;

export const organizations = mysqlTable(
  "organizations",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    ownerUserId: int("ownerUserId").notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [uniqueIndex("organizations_owner_uq").on(table.ownerUserId)]
);

export const organizationMembers = mysqlTable(
  "organizationMembers",
  {
    id: int("id").autoincrement().primaryKey(),
    organizationId: int("organizationId").notNull(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", organizationRole).default("member").notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [uniqueIndex("organization_members_org_user_uq").on(table.organizationId, table.userId), index("organization_members_user_idx").on(table.userId)]
);

export const subscriberStatus = ["active", "unsubscribed", "bounced"] as const;
export const campaignStatus = ["draft", "scheduled", "sending", "sent"] as const;
export const deliveryStatus = ["sent", "failed"] as const;
export const consentAction = ["granted", "withdrawn"] as const;
export const consentBasis = ["consent", "legitimate_interest", "contract"] as const;
export const bounceType = ["hard", "soft"] as const;
export const automationStatus = ["active", "paused"] as const;
export const templateStatus = ["active", "archived"] as const;

export const subscribers = mysqlTable(
  "subscribers",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    firstName: varchar("firstName", { length: 120 }),
    lastName: varchar("lastName", { length: 120 }),
    status: mysqlEnum("status", subscriberStatus).default("active").notNull(),
    tags: text("tags").notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    unsubscribedAt: bigint("unsubscribedAt", { mode: "number" }),
  },
  table => [
    uniqueIndex("subscribers_user_email_uq").on(table.userId, table.email),
    index("subscribers_user_status_idx").on(table.userId, table.status),
  ]
);

export const segments = mysqlTable(
  "segments",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    criteria: text("criteria").notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [index("segments_user_idx").on(table.userId)]
);

export const emailTemplates = mysqlTable(
  "emailTemplates",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    description: varchar("description", { length: 320 }),
    tags: text("tags"),
    status: mysqlEnum("status", templateStatus).default("active").notNull(),
    isFavorite: int("isFavorite").default(0).notNull(),
    previewText: varchar("previewText", { length: 255 }),
    contentBlocks: text("contentBlocks").notNull(),
    sourceCampaignId: int("sourceCampaignId"),
    usageCount: int("usageCount").default(0).notNull(),
    lastUsedAt: bigint("lastUsedAt", { mode: "number" }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [index("email_templates_user_idx").on(table.userId), index("email_templates_user_status_idx").on(table.userId, table.status), index("email_templates_user_category_idx").on(table.userId, table.category)]
);

export const campaigns = mysqlTable(
  "campaigns",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    previewText: varchar("previewText", { length: 255 }),
    contentBlocks: text("contentBlocks").notNull(),
    targetSegmentId: int("targetSegmentId"),
    smtpProfileId: int("smtpProfileId"),
    status: mysqlEnum("status", campaignStatus).default("draft").notNull(),
    scheduledFor: bigint("scheduledFor", { mode: "number" }),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    sentAt: bigint("sentAt", { mode: "number" }),
    sentCount: int("sentCount").default(0).notNull(),
    openCount: int("openCount").default(0).notNull(),
    clickCount: int("clickCount").default(0).notNull(),
    unsubscribeCount: int("unsubscribeCount").default(0).notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [
    index("campaigns_user_status_idx").on(table.userId, table.status),
    index("campaigns_schedule_task_idx").on(table.scheduleCronTaskUid),
  ]
);

export const campaignDeliveries = mysqlTable(
  "campaignDeliveries",
  {
    id: int("id").autoincrement().primaryKey(),
    campaignId: int("campaignId").notNull(),
    subscriberId: int("subscriberId").notNull(),
    recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
    status: mysqlEnum("status", deliveryStatus).notNull(),
    sentAt: bigint("sentAt", { mode: "number" }),
    openedAt: bigint("openedAt", { mode: "number" }),
    clickedAt: bigint("clickedAt", { mode: "number" }),
    unsubscribedAt: bigint("unsubscribedAt", { mode: "number" }),
    errorMessage: text("errorMessage"),
  },
  table => [
    uniqueIndex("deliveries_campaign_subscriber_uq").on(table.campaignId, table.subscriberId),
    index("deliveries_campaign_idx").on(table.campaignId),
  ]
);

export const consentEvents = mysqlTable(
  "consentEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    subscriberId: int("subscriberId").notNull(),
    action: mysqlEnum("action", consentAction).notNull(),
    basis: mysqlEnum("basis", consentBasis).notNull(),
    source: varchar("source", { length: 120 }).notNull(),
    proof: text("proof"),
    capturedAt: bigint("capturedAt", { mode: "number" }).notNull(),
  },
  table => [index("consent_events_subscriber_idx").on(table.subscriberId), index("consent_events_user_idx").on(table.userId)]
);

export const bounceEvents = mysqlTable(
  "bounceEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    subscriberId: int("subscriberId"),
    recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
    type: mysqlEnum("type", bounceType).notNull(),
    providerEventId: varchar("providerEventId", { length: 160 }),
    reason: text("reason"),
    occurredAt: bigint("occurredAt", { mode: "number" }).notNull(),
    processedAt: bigint("processedAt", { mode: "number" }).notNull(),
  },
  table => [index("bounce_events_user_idx").on(table.userId), index("bounce_events_subscriber_idx").on(table.subscriberId), uniqueIndex("bounce_events_provider_event_uq").on(table.userId, table.providerEventId)]
);

export const smtpSettings = mysqlTable(
  "smtpSettings",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    fromName: varchar("fromName", { length: 120 }),
    replyTo: varchar("replyTo", { length: 320 }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [uniqueIndex("smtp_settings_user_uq").on(table.userId)]
);

export const smtpProfiles = mysqlTable(
  "smtpProfiles",
  {
    id: int("id").autoincrement().primaryKey(),
    organizationId: int("organizationId").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    host: varchar("host", { length: 255 }).notNull(),
    port: int("port").notNull(),
    username: varchar("username", { length: 320 }).notNull(),
    encryptedPassword: text("encryptedPassword").notNull(),
    fromEmail: varchar("fromEmail", { length: 320 }).notNull(),
    fromName: varchar("fromName", { length: 120 }),
    replyTo: varchar("replyTo", { length: 320 }),
    status: mysqlEnum("status", smtpProfileStatus).default("draft").notNull(),
    isActive: int("isActive").default(0).notNull(),
    lastVerifiedAt: bigint("lastVerifiedAt", { mode: "number" }),
    lastError: varchar("lastError", { length: 1000 }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [index("smtp_profiles_org_idx").on(table.organizationId), index("smtp_profiles_org_active_idx").on(table.organizationId, table.isActive)]
);

export const organizationAssets = mysqlTable(
  "organizationAssets",
  {
    id: int("id").autoincrement().primaryKey(),
    organizationId: int("organizationId").notNull(),
    uploadedByUserId: int("uploadedByUserId").notNull(),
    storageKey: varchar("storageKey", { length: 500 }).notNull(),
    url: varchar("url", { length: 700 }).notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    contentType: varchar("contentType", { length: 120 }).notNull(),
    sizeBytes: int("sizeBytes").notNull(),
    altText: varchar("altText", { length: 255 }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  },
  table => [index("organization_assets_org_created_idx").on(table.organizationId, table.createdAt), uniqueIndex("organization_assets_key_uq").on(table.storageKey)]
);

export const deliveryAlertSettings = mysqlTable(
  "deliveryAlertSettings",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    bounceThresholdBps: int("bounceThresholdBps").default(200).notNull(),
    unsubscribeThresholdBps: int("unsubscribeThresholdBps").default(100).notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [uniqueIndex("delivery_alert_settings_user_uq").on(table.userId)]
);

export const testEmailHistory = mysqlTable(
  "testEmailHistory",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    previewText: varchar("previewText", { length: 255 }),
    contentBlocks: text("contentBlocks").notNull(),
    smtpProfileId: int("smtpProfileId"),
    sentAt: bigint("sentAt", { mode: "number" }).notNull(),
  },
  table => [index("test_email_history_user_sent_idx").on(table.userId, table.sentAt)]
);

export const brandToneProfiles = mysqlTable(
  "brandToneProfiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    tone: varchar("tone", { length: 32 }).notNull(),
    instructions: text("instructions").notNull(),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [uniqueIndex("brand_tone_profiles_user_name_uq").on(table.userId, table.name), index("brand_tone_profiles_user_idx").on(table.userId)]
);

export const automationRules = mysqlTable(
  "automationRules",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    trigger: varchar("trigger", { length: 64 }).notNull(),
    delayMinutes: int("delayMinutes").notNull(),
    targetSegmentId: int("targetSegmentId"),
    smtpProfileId: int("smtpProfileId"),
    subject: varchar("subject", { length: 255 }).notNull(),
    previewText: varchar("previewText", { length: 255 }),
    contentBlocks: text("contentBlocks").notNull(),
    status: mysqlEnum("status", automationStatus).default("paused").notNull(),
    activatedAt: bigint("activatedAt", { mode: "number" }),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    createdAt: bigint("createdAt", { mode: "number" }).notNull(),
    updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
  },
  table => [index("automation_rules_user_idx").on(table.userId), index("automation_rules_task_idx").on(table.scheduleCronTaskUid)]
);

export const automationDeliveries = mysqlTable(
  "automationDeliveries",
  {
    id: int("id").autoincrement().primaryKey(),
    automationRuleId: int("automationRuleId").notNull(),
    subscriberId: int("subscriberId").notNull(),
    recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
    status: mysqlEnum("status", deliveryStatus).notNull(),
    sentAt: bigint("sentAt", { mode: "number" }),
    errorMessage: text("errorMessage"),
  },
  table => [uniqueIndex("automation_deliveries_rule_subscriber_uq").on(table.automationRuleId, table.subscriberId), index("automation_deliveries_rule_idx").on(table.automationRuleId)]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Organization = typeof organizations.$inferSelect;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type Subscriber = typeof subscribers.$inferSelect;
export type Segment = typeof segments.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type CampaignDelivery = typeof campaignDeliveries.$inferSelect;
export type ConsentEvent = typeof consentEvents.$inferSelect;
export type BounceEvent = typeof bounceEvents.$inferSelect;
export type SmtpSettings = typeof smtpSettings.$inferSelect;
export type SmtpProfile = typeof smtpProfiles.$inferSelect;
export type OrganizationAsset = typeof organizationAssets.$inferSelect;
export type DeliveryAlertSettings = typeof deliveryAlertSettings.$inferSelect;
export type TestEmailHistory = typeof testEmailHistory.$inferSelect;
export type BrandToneProfile = typeof brandToneProfiles.$inferSelect;
export type AutomationRule = typeof automationRules.$inferSelect;
export type AutomationDelivery = typeof automationDeliveries.$inferSelect;
