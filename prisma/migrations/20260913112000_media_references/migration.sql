-- Additive only. No reset, no content/data deletion.
CREATE TABLE `MediaReference` (
 `assetId` BIGINT NOT NULL,
 `entityType` VARCHAR(32) NOT NULL,
 `entityId` VARCHAR(64) NOT NULL,
 PRIMARY KEY (`assetId`, `entityType`, `entityId`),
 INDEX `MediaReference_entityType_entityId_idx` (`entityType`, `entityId`),
 CONSTRAINT `MediaReference_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `MediaAsset` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Protect previously registered assets already referenced by content before orphan maintenance.
INSERT IGNORE INTO `MediaReference` SELECT m.id, 'script', CAST(s.id AS CHAR) FROM `MediaAsset` m JOIN `Script` s ON s.coverUrl=m.url;
INSERT IGNORE INTO `MediaReference` SELECT m.id, 'script', CAST(c.scriptId AS CHAR) FROM `MediaAsset` m JOIN `ScriptCharacter` c ON c.image=m.url;
INSERT IGNORE INTO `MediaReference` SELECT m.id, 'costume', CAST(c.id AS CHAR) FROM `MediaAsset` m JOIN `Costume` c ON c.coverUrl=m.url OR JSON_CONTAINS(c.images, JSON_QUOTE(m.url));
INSERT IGNORE INTO `MediaReference` SELECT m.id, 'dm', CAST(d.id AS CHAR) FROM `MediaAsset` m JOIN `Dm` d ON d.avatar=m.url OR d.photo=m.url;
