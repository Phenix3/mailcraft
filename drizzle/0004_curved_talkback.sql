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
CREATE TABLE `testEmailHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`previewText` varchar(255),
	`contentBlocks` text NOT NULL,
	`sentAt` bigint NOT NULL,
	CONSTRAINT `testEmailHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `brand_tone_profiles_user_idx` ON `brandToneProfiles` (`userId`);--> statement-breakpoint
CREATE INDEX `test_email_history_user_sent_idx` ON `testEmailHistory` (`userId`,`sentAt`);