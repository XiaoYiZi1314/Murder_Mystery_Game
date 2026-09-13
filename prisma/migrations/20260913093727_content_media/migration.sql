/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `costume` table. All the data in the column will be lost.
  - You are about to drop the column `stockAvailable` on the `costume` table. All the data in the column will be lost.
  - You are about to drop the column `stockTotal` on the `costume` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `costume` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(4))` to `Enum(EnumId(4))`.
  - You are about to drop the column `difficulty` on the `script` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `script` table. All the data in the column will be lost.
  - The values [published,archived] on the enum `Script_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `_costumetoscript` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `coverUrl` to the `Costume` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `_costumetoscript` DROP FOREIGN KEY `_CostumeToScript_A_fkey`;

-- DropForeignKey
ALTER TABLE `_costumetoscript` DROP FOREIGN KEY `_CostumeToScript_B_fkey`;

-- DropIndex
DROP INDEX `Script_status_difficulty_idx` ON `script`;

-- AlterTable
ALTER TABLE `costume` DROP COLUMN `imageUrl`,
    DROP COLUMN `stockAvailable`,
    DROP COLUMN `stockTotal`,
    ADD COLUMN `coverUrl` VARCHAR(2048) NOT NULL,
    ADD COLUMN `images` JSON NULL,
    MODIFY `status` ENUM('draft', 'on', 'off') NOT NULL DEFAULT 'draft';

-- AlterTable
ALTER TABLE `dm` ADD COLUMN `avatar` VARCHAR(2048) NULL,
    ADD COLUMN `photo` VARCHAR(2048) NULL,
    ADD COLUMN `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE `script` DROP COLUMN `difficulty`,
    DROP COLUMN `tags`,
    ADD COLUMN `avgRating` DECIMAL(3, 2) NULL,
    ADD COLUMN `featured` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `reviewCount` INTEGER NOT NULL DEFAULT 0,
    MODIFY `status` ENUM('draft', 'on', 'off') NOT NULL DEFAULT 'draft';

-- DropTable
DROP TABLE `_costumetoscript`;

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
