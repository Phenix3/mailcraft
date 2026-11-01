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
ALTER TABLE `automationRules` ADD `smtpProfileId` int;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `smtpProfileId` int;--> statement-breakpoint
ALTER TABLE `testEmailHistory` ADD `smtpProfileId` int;--> statement-breakpoint
CREATE INDEX `organization_assets_org_created_idx` ON `organizationAssets` (`organizationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `organization_members_user_idx` ON `organizationMembers` (`userId`);--> statement-breakpoint
CREATE INDEX `smtp_profiles_org_idx` ON `smtpProfiles` (`organizationId`);--> statement-breakpoint
CREATE INDEX `smtp_profiles_org_active_idx` ON `smtpProfiles` (`organizationId`,`isActive`);