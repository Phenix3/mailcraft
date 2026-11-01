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
CREATE TABLE `emailTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`previewText` varchar(255),
	`contentBlocks` text NOT NULL,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `emailTemplates_id` PRIMARY KEY(`id`)
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
CREATE TABLE `subscribers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`firstName` varchar(120),
	`lastName` varchar(120),
	`status` enum('active','unsubscribed') NOT NULL DEFAULT 'active',
	`tags` text NOT NULL,
	`createdAt` bigint NOT NULL,
	`unsubscribedAt` bigint,
	CONSTRAINT `subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscribers_user_email_uq` UNIQUE(`userId`,`email`)
);
--> statement-breakpoint
CREATE INDEX `deliveries_campaign_idx` ON `campaignDeliveries` (`campaignId`);--> statement-breakpoint
CREATE INDEX `campaigns_user_status_idx` ON `campaigns` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `campaigns_schedule_task_idx` ON `campaigns` (`scheduleCronTaskUid`);--> statement-breakpoint
CREATE INDEX `email_templates_user_idx` ON `emailTemplates` (`userId`);--> statement-breakpoint
CREATE INDEX `segments_user_idx` ON `segments` (`userId`);--> statement-breakpoint
CREATE INDEX `subscribers_user_status_idx` ON `subscribers` (`userId`,`status`);