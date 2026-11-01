ALTER TABLE `emailTemplates` ADD `description` varchar(320);--> statement-breakpoint
ALTER TABLE `emailTemplates` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `emailTemplates` ADD `status` enum('active','archived') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `emailTemplates` ADD `isFavorite` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `emailTemplates` ADD `sourceCampaignId` int;--> statement-breakpoint
ALTER TABLE `emailTemplates` ADD `usageCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `emailTemplates` ADD `lastUsedAt` bigint;--> statement-breakpoint
CREATE INDEX `email_templates_user_status_idx` ON `emailTemplates` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `email_templates_user_category_idx` ON `emailTemplates` (`userId`,`category`);