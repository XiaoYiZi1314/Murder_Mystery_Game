-- CreateTable
CREATE TABLE `User` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(32) NOT NULL,
    `nickname` VARCHAR(80) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `balance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `points` INTEGER NOT NULL DEFAULT 0,
    `totalTopup` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `role` ENUM('customer', 'dm', 'manager', 'boss') NOT NULL DEFAULT 'customer',
    `status` ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
    `memberLevelId` BIGINT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_phone_key`(`phone`),
    INDEX `User_role_status_idx`(`role`, `status`),
    INDEX `User_memberLevelId_idx`(`memberLevelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MemberLevel` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(32) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `rank` INTEGER NOT NULL,
    `topupThreshold` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `discountRate` DECIMAL(5, 4) NOT NULL DEFAULT 1.0000,
    `benefits` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MemberLevel_code_key`(`code`),
    UNIQUE INDEX `MemberLevel_rank_key`(`rank`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Script` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `coverUrl` VARCHAR(2048) NOT NULL,
    `tagline` VARCHAR(255) NULL,
    `synopsis` TEXT NOT NULL,
    `durationMinutes` INTEGER NOT NULL,
    `minPlayers` INTEGER NOT NULL,
    `maxPlayers` INTEGER NOT NULL,
    `difficulty` ENUM('beginner', 'intermediate', 'advanced') NOT NULL,
    `pricePerPlayer` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `tags` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Script_slug_key`(`slug`),
    INDEX `Script_status_difficulty_idx`(`status`, `difficulty`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Dm` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userId` BIGINT NOT NULL,
    `bio` TEXT NULL,
    `rating` DECIMAL(3, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Dm_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Costume` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(160) NOT NULL,
    `imageUrl` VARCHAR(2048) NOT NULL,
    `description` TEXT NULL,
    `stockTotal` INTEGER NOT NULL DEFAULT 0,
    `stockAvailable` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('available', 'maintenance', 'retired') NOT NULL DEFAULT 'available',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Costume_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `scriptId` BIGINT NOT NULL,
    `dmId` BIGINT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `roomName` VARCHAR(80) NOT NULL,
    `capacity` INTEGER NOT NULL,
    `status` ENUM('scheduled', 'open', 'full', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Session_scriptId_startsAt_idx`(`scriptId`, `startsAt`),
    INDEX `Session_dmId_startsAt_idx`(`dmId`, `startsAt`),
    INDEX `Session_status_startsAt_idx`(`status`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `bookingNo` VARCHAR(40) NOT NULL,
    `userId` BIGINT NOT NULL,
    `sessionId` BIGINT NOT NULL,
    `playerCount` INTEGER NOT NULL,
    `totalAmount` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('pending', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    `note` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Booking_bookingNo_key`(`bookingNo`),
    INDEX `Booking_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `Booking_sessionId_status_idx`(`sessionId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `operation_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `actorId` BIGINT NOT NULL,
    `actorRole` ENUM('customer', 'dm', 'manager', 'boss') NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `targetType` VARCHAR(60) NOT NULL,
    `targetId` VARCHAR(60) NOT NULL,
    `summaryBefore` JSON NULL,
    `summaryAfter` JSON NULL,
    `ip` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `operation_logs_actorId_createdAt_idx`(`actorId`, `createdAt`),
    INDEX `operation_logs_targetType_targetId_idx`(`targetType`, `targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `idempotency_records` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `actorId` BIGINT NOT NULL,
    `operation` VARCHAR(100) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `requestHash` VARCHAR(64) NOT NULL,
    `status` ENUM('pending', 'completed') NOT NULL DEFAULT 'pending',
    `responseJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    INDEX `idempotency_records_status_createdAt_idx`(`status`, `createdAt`),
    UNIQUE INDEX `idempotency_records_actorId_operation_key_key`(`actorId`, `operation`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_outbox` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(100) NOT NULL,
    `payloadJson` JSON NOT NULL,
    `status` ENUM('pending', 'delivered', 'dead') NOT NULL DEFAULT 'pending',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `nextRetryAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deliveredAt` DATETIME(3) NULL,

    INDEX `event_outbox_status_nextRetryAt_idx`(`status`, `nextRetryAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userId` BIGINT NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` VARCHAR(2000) NOT NULL,
    `eventId` VARCHAR(60) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_createdAt_idx`(`userId`, `createdAt`),
    UNIQUE INDEX `notifications_eventId_userId_key`(`eventId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CostumeToScript` (
    `A` BIGINT NOT NULL,
    `B` BIGINT NOT NULL,

    UNIQUE INDEX `_CostumeToScript_AB_unique`(`A`, `B`),
    INDEX `_CostumeToScript_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_memberLevelId_fkey` FOREIGN KEY (`memberLevelId`) REFERENCES `MemberLevel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dm` ADD CONSTRAINT `Dm_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_scriptId_fkey` FOREIGN KEY (`scriptId`) REFERENCES `Script`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_dmId_fkey` FOREIGN KEY (`dmId`) REFERENCES `Dm`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `Session`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CostumeToScript` ADD CONSTRAINT `_CostumeToScript_A_fkey` FOREIGN KEY (`A`) REFERENCES `Costume`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CostumeToScript` ADD CONSTRAINT `_CostumeToScript_B_fkey` FOREIGN KEY (`B`) REFERENCES `Script`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
