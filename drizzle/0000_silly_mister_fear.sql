CREATE TABLE `automationDeliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`automationRuleId` int NOT NULL,
	`subscriberId` int NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`status` enum('sent','failed') NOT NULL,
	`sentAt` bigint,
	`errorMessage` text,
	CONSTRAINT `automationDeliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `automation_deliveries_rule_subscriber_uq` UNIQUE(`automationRuleId`,`subscriberId`)
);
--> statement-breakpoint
CREATE TABLE `automationRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`trigger` varchar(64) NOT NULL,
	`delayMinutes` int NOT NULL,
	`targetSegmentId` int,
	`smtpProfileId` int,
	`subject` varchar(255) NOT NULL,
	`previewText` varchar(255),
	`contentBlocks` text NOT NULL,
	`status` enum('active','paused') NOT NULL DEFAULT 'paused',
	`activatedAt` bigint,
	`scheduleCronTaskUid` varchar(65),
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `automationRules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bounceEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subscriberId` int,
	`recipientEmail` varchar(320) NOT NULL,
	`type` enum('hard','soft') NOT NULL,
	`providerEventId` varchar(160),
	`reason` text,
	`occurredAt` bigint NOT NULL,
	`processedAt` bigint NOT NULL,
	CONSTRAINT `bounceEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `bounce_events_provider_event_uq` UNIQUE(`userId`,`providerEventId`)
);
--> statement-breakpoint
CREATE TABLE `brandToneProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`tone` varchar(32) NOT NULL,
	`instructions` text NOT NULL,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `brandToneProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `brand_tone_profiles_user_name_uq` UNIQUE(`userId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `campaignDeliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`subscriberId` int NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`status` enum('sent','failed') NOT NULL,
	`sentAt` bigint,
	`openedAt` bigint,
	`clickedAt` bigint,
	`unsubscribedAt` bigint,
	`errorMessage` text,
	CONSTRAINT `campaignDeliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `deliveries_campaign_subscriber_uq` UNIQUE(`campaignId`,`subscriberId`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`previewText` varchar(255),
	`contentBlocks` text NOT NULL,
	`targetSegmentId` int,
	`smtpProfileId` int,
	`status` enum('draft','scheduled','sending','sent') NOT NULL DEFAULT 'draft',
	`scheduledFor` bigint,
	`scheduleCronTaskUid` varchar(65),
	`sentAt` bigint,
	`sentCount` int NOT NULL DEFAULT 0,
	`openCount` int NOT NULL DEFAULT 0,
	`clickCount` int NOT NULL DEFAULT 0,
	`unsubscribeCount` int NOT NULL DEFAULT 0,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `consentEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subscriberId` int NOT NULL,
	`action` enum('granted','withdrawn') NOT NULL,
	`basis` enum('consent','legitimate_interest','contract') NOT NULL,
	`source` varchar(120) NOT NULL,
	`proof` text,
	`capturedAt` bigint NOT NULL,
	CONSTRAINT `consentEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deliveryAlertSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bounceThresholdBps` int NOT NULL DEFAULT 200,
	`unsubscribeThresholdBps` int NOT NULL DEFAULT 100,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `deliveryAlertSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `delivery_alert_settings_user_uq` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `emailTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`description` varchar(320),
	`tags` text,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`isFavorite` int NOT NULL DEFAULT 0,
	`previewText` varchar(255),
	`contentBlocks` text NOT NULL,
	`sourceCampaignId` int,
	`usageCount` int NOT NULL DEFAULT 0,
	`lastUsedAt` bigint,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `emailTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizationAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`uploadedByUserId` int NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`url` varchar(700) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`contentType` varchar(120) NOT NULL,
	`sizeBytes` int NOT NULL,
	`altText` varchar(255),
	`createdAt` bigint NOT NULL,
	CONSTRAINT `organizationAssets_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_assets_key_uq` UNIQUE(`storageKey`)
);
--> statement-breakpoint
CREATE TABLE `organizationMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','member') NOT NULL DEFAULT 'member',
	`createdAt` bigint NOT NULL,
	CONSTRAINT `organizationMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_members_org_user_uq` UNIQUE(`organizationId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`ownerUserId` int NOT NULL,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_owner_uq` UNIQUE(`ownerUserId`)
);
--> statement-breakpoint
CREATE TABLE `segments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text,
	`criteria` text NOT NULL,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `segments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smtpProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`host` varchar(255) NOT NULL,
	`port` int NOT NULL,
	`username` varchar(320) NOT NULL,
	`encryptedPassword` text NOT NULL,
	`fromEmail` varchar(320) NOT NULL,
	`fromName` varchar(120),
	`replyTo` varchar(320),
	`status` enum('draft','verified','failed') NOT NULL DEFAULT 'draft',
	`isActive` int NOT NULL DEFAULT 0,
	`lastVerifiedAt` bigint,
	`lastError` varchar(1000),
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `smtpProfiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smtpSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fromName` varchar(120),
	`replyTo` varchar(320),
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `smtpSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `smtp_settings_user_uq` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `subscribers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`firstName` varchar(120),
	`lastName` varchar(120),
	`status` enum('active','unsubscribed','bounced') NOT NULL DEFAULT 'active',
	`tags` text NOT NULL,
	`createdAt` bigint NOT NULL,
	`unsubscribedAt` bigint,
	CONSTRAINT `subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscribers_user_email_uq` UNIQUE(`userId`,`email`)
);
--> statement-breakpoint
CREATE TABLE `testEmailHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`previewText` varchar(255),
	`contentBlocks` text NOT NULL,
	`smtpProfileId` int,
	`sentAt` bigint NOT NULL,
	CONSTRAINT `testEmailHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`passwordHash` text,
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `automation_deliveries_rule_idx` ON `automationDeliveries` (`automationRuleId`);--> statement-breakpoint
CREATE INDEX `automation_rules_user_idx` ON `automationRules` (`userId`);--> statement-breakpoint
CREATE INDEX `automation_rules_task_idx` ON `automationRules` (`scheduleCronTaskUid`);--> statement-breakpoint
CREATE INDEX `bounce_events_user_idx` ON `bounceEvents` (`userId`);--> statement-breakpoint
CREATE INDEX `bounce_events_subscriber_idx` ON `bounceEvents` (`subscriberId`);--> statement-breakpoint
CREATE INDEX `brand_tone_profiles_user_idx` ON `brandToneProfiles` (`userId`);--> statement-breakpoint
CREATE INDEX `deliveries_campaign_idx` ON `campaignDeliveries` (`campaignId`);--> statement-breakpoint
CREATE INDEX `campaigns_user_status_idx` ON `campaigns` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `campaigns_schedule_task_idx` ON `campaigns` (`scheduleCronTaskUid`);--> statement-breakpoint
CREATE INDEX `consent_events_subscriber_idx` ON `consentEvents` (`subscriberId`);--> statement-breakpoint
CREATE INDEX `consent_events_user_idx` ON `consentEvents` (`userId`);--> statement-breakpoint
CREATE INDEX `email_templates_user_idx` ON `emailTemplates` (`userId`);--> statement-breakpoint
CREATE INDEX `email_templates_user_status_idx` ON `emailTemplates` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `email_templates_user_category_idx` ON `emailTemplates` (`userId`,`category`);--> statement-breakpoint
CREATE INDEX `organization_assets_org_created_idx` ON `organizationAssets` (`organizationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `organization_members_user_idx` ON `organizationMembers` (`userId`);--> statement-breakpoint
CREATE INDEX `segments_user_idx` ON `segments` (`userId`);--> statement-breakpoint
CREATE INDEX `smtp_profiles_org_idx` ON `smtpProfiles` (`organizationId`);--> statement-breakpoint
CREATE INDEX `smtp_profiles_org_active_idx` ON `smtpProfiles` (`organizationId`,`isActive`);--> statement-breakpoint
CREATE INDEX `subscribers_user_status_idx` ON `subscribers` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `test_email_history_user_sent_idx` ON `testEmailHistory` (`userId`,`sentAt`);