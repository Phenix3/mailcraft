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
	`subject` varchar(255) NOT NULL,
	`previewText` varchar(255),
	`contentBlocks` text NOT NULL,
	`status` enum('active','paused') NOT NULL DEFAULT 'paused',
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
ALTER TABLE `subscribers` MODIFY COLUMN `status` enum('active','unsubscribed','bounced') NOT NULL DEFAULT 'active';--> statement-breakpoint
CREATE INDEX `automation_deliveries_rule_idx` ON `automationDeliveries` (`automationRuleId`);--> statement-breakpoint
CREATE INDEX `automation_rules_user_idx` ON `automationRules` (`userId`);--> statement-breakpoint
CREATE INDEX `automation_rules_task_idx` ON `automationRules` (`scheduleCronTaskUid`);--> statement-breakpoint
CREATE INDEX `bounce_events_user_idx` ON `bounceEvents` (`userId`);--> statement-breakpoint
CREATE INDEX `bounce_events_subscriber_idx` ON `bounceEvents` (`subscriberId`);--> statement-breakpoint
CREATE INDEX `consent_events_subscriber_idx` ON `consentEvents` (`subscriberId`);--> statement-breakpoint
CREATE INDEX `consent_events_user_idx` ON `consentEvents` (`userId`);