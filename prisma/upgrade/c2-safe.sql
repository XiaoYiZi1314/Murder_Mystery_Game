-- Safe alternative for databases still at C1. Never edit the already-applied historical migration.
-- Stop writes and export a full database backup before applying.
CREATE TABLE `c2_legacy_script` AS SELECT id, difficulty, tags, status FROM `Script`;
CREATE TABLE `c2_legacy_costume` AS SELECT id, imageUrl, stockTotal, stockAvailable, status FROM `Costume`;
CREATE TABLE `c2_legacy_script_costume` AS SELECT * FROM `_CostumeToScript`;
ALTER TABLE `Script` MODIFY status ENUM('draft','published','archived','on','off') NOT NULL DEFAULT 'draft';
UPDATE `Script` SET status=CASE status WHEN 'published' THEN 'on' WHEN 'archived' THEN 'off' ELSE status END;
ALTER TABLE `Costume` MODIFY status ENUM('available','maintenance','retired','draft','on','off') NOT NULL DEFAULT 'draft';
UPDATE `Costume` SET status=CASE status WHEN 'available' THEN 'on' ELSE 'off' END;
-- DropForeignKey
ALTER TABLE `_CostumeToScript` DROP FOREIGN KEY `_CostumeToScript_A_fkey`;

-- DropForeignKey
ALTER TABLE `_CostumeToScript` DROP FOREIGN KEY `_CostumeToScript_B_fkey`;

-- DropIndex
DROP INDEX `Script_status_difficulty_idx` ON `Script`;

-- AlterTable
ALTER TABLE `Costume` CHANGE COLUMN `imageUrl` `coverUrl` VARCHAR(2048) NOT NULL,
    DROP COLUMN `stockAvailable`,
    DROP COLUMN `stockTotal`,
    ADD COLUMN `images` JSON NULL,
    MODIFY `status` ENUM('draft', 'on', 'off') NOT NULL DEFAULT 'draft';

-- AlterTable
ALTER TABLE `Dm` ADD COLUMN `avatar` VARCHAR(2048) NULL,
    ADD COLUMN `photo` VARCHAR(2048) NULL,
    ADD COLUMN `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE `Script` DROP COLUMN `difficulty`,
    DROP COLUMN `tags`,
    ADD COLUMN `avgRating` DECIMAL(3, 2) NULL,
    ADD COLUMN `featured` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `reviewCount` INTEGER NOT NULL DEFAULT 0,
    MODIFY `status` ENUM('draft', 'on', 'off') NOT NULL DEFAULT 'draft';

-- DropTable
DROP TABLE `_CostumeToScript`;

-- CreateTable
CREATE TABLE `ScriptCharacter` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `scriptId` BIGINT NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `image` VARCHAR(2048) NULL,
    `bio` TEXT NULL,
    `sort` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ScriptCharacter_scriptId_sort_idx`(`scriptId`, `sort`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tag` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(40) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Tag_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScriptTag` (
    `scriptId` BIGINT NOT NULL,
    `tagId` BIGINT NOT NULL,

    PRIMARY KEY (`scriptId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScriptCostume` (
    `scriptId` BIGINT NOT NULL,
    `costumeId` BIGINT NOT NULL,

    PRIMARY KEY (`scriptId`, `costumeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScriptDm` (
    `scriptId` BIGINT NOT NULL,
    `dmId` BIGINT NOT NULL,

    PRIMARY KEY (`scriptId`, `dmId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DmTag` (
    `dmId` BIGINT NOT NULL,
    `tagId` BIGINT NOT NULL,

    PRIMARY KEY (`dmId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `key` VARCHAR(64) NOT NULL,
    `value` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MediaAsset` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(64) NOT NULL,
    `ownerId` BIGINT NULL,
    `purpose` ENUM('cover', 'role', 'dm', 'costume', 'report') NOT NULL,
    `visibility` ENUM('public', 'private') NOT NULL,
    `format` VARCHAR(10) NOT NULL,
    `bytes` INTEGER NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `url` VARCHAR(2048) NOT NULL,
    `thumbUrl` VARCHAR(2048) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MediaAsset_key_key`(`key`),
    INDEX `MediaAsset_ownerId_createdAt_idx`(`ownerId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Dm_status_idx` ON `Dm`(`status`);

-- CreateIndex
CREATE INDEX `Script_status_updatedAt_idx` ON `Script`(`status`, `updatedAt`);

-- CreateIndex
CREATE INDEX `Script_featured_status_idx` ON `Script`(`featured`, `status`);

-- AddForeignKey
ALTER TABLE `ScriptCharacter` ADD CONSTRAINT `ScriptCharacter_scriptId_fkey` FOREIGN KEY (`scriptId`) REFERENCES `Script`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScriptTag` ADD CONSTRAINT `ScriptTag_scriptId_fkey` FOREIGN KEY (`scriptId`) REFERENCES `Script`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScriptTag` ADD CONSTRAINT `ScriptTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScriptCostume` ADD CONSTRAINT `ScriptCostume_scriptId_fkey` FOREIGN KEY (`scriptId`) REFERENCES `Script`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScriptCostume` ADD CONSTRAINT `ScriptCostume_costumeId_fkey` FOREIGN KEY (`costumeId`) REFERENCES `Costume`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScriptDm` ADD CONSTRAINT `ScriptDm_scriptId_fkey` FOREIGN KEY (`scriptId`) REFERENCES `Script`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScriptDm` ADD CONSTRAINT `ScriptDm_dmId_fkey` FOREIGN KEY (`dmId`) REFERENCES `Dm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DmTag` ADD CONSTRAINT `DmTag_dmId_fkey` FOREIGN KEY (`dmId`) REFERENCES `Dm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DmTag` ADD CONSTRAINT `DmTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaAsset` ADD CONSTRAINT `MediaAsset_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve normalized tags and all existing cross-links. Inventory/difficulty remain in archival tables only.
INSERT IGNORE INTO `Tag` (name, createdAt, updatedAt)
 SELECT DISTINCT TRIM(j.name), NOW(3), NOW(3) FROM `c2_legacy_script` l,
 JSON_TABLE(COALESCE(l.tags,JSON_ARRAY()), '$[*]' COLUMNS(name VARCHAR(255) PATH '$')) j WHERE TRIM(j.name)<>'';
INSERT IGNORE INTO `ScriptTag` (scriptId,tagId)
 SELECT l.id,t.id FROM `c2_legacy_script` l,
 JSON_TABLE(COALESCE(l.tags,JSON_ARRAY()), '$[*]' COLUMNS(name VARCHAR(255) PATH '$')) j JOIN `Tag` t ON t.name=TRIM(j.name) COLLATE utf8mb4_unicode_ci;
INSERT INTO `ScriptCostume` (scriptId,costumeId) SELECT B,A FROM `c2_legacy_script_costume`;
-- C1 demo DM scores are not C6 review aggregates.
UPDATE `Dm` SET rating=NULL;
