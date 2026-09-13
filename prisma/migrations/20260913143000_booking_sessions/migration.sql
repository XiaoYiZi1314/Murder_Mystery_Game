-- C3 additive conversion. Full backup + stopped writers required for a business database.
-- Keep original fields/amounts and archive every legacy status before expanding/converting enums.
CREATE TABLE `c3_legacy_sessions` AS SELECT id,status,capacity,startsAt,endsAt,roomName FROM `Session`;
CREATE TABLE `c3_legacy_bookings` AS SELECT id,status,playerCount,totalAmount FROM `Booking`;
ALTER TABLE `Session` MODIFY status ENUM('scheduled','open','full','completed','cancelled','draft','locked','running','finished') NOT NULL DEFAULT 'draft',
 ADD minPlayers INTEGER NOT NULL DEFAULT 1, ADD bookedCount INTEGER NOT NULL DEFAULT 0,
 ADD pricePerPlayer DECIMAL(10,2) NOT NULL DEFAULT 0, ADD source VARCHAR(20) NOT NULL DEFAULT 'merchant',
 ADD initiatorUserId BIGINT NULL, ADD remark VARCHAR(500) NULL;
ALTER TABLE `Booking` MODIFY status ENUM('pending','confirmed','completed','cancelled','joined','locked','finished','jumped') NOT NULL DEFAULT 'joined',
 ADD contactName VARCHAR(80) NOT NULL DEFAULT '', ADD contactPhone VARCHAR(32) NOT NULL DEFAULT '',
 ADD cancelledAt DATETIME(3) NULL, ADD depositRecorded BOOLEAN NOT NULL DEFAULT false;
UPDATE `Booking` b JOIN `User` u ON u.id=b.userId SET b.contactName=u.nickname,b.contactPhone=u.phone,
 b.status=CASE b.status WHEN 'pending' THEN 'joined' WHEN 'confirmed' THEN 'locked' WHEN 'completed' THEN 'finished' ELSE b.status END;
UPDATE `Session` s JOIN `Script` p ON s.scriptId=p.id SET s.minPlayers=LEAST(p.minPlayers,s.capacity),s.pricePerPlayer=p.pricePerPlayer,
 s.status=CASE s.status WHEN 'scheduled' THEN 'draft' WHEN 'completed' THEN 'finished' ELSE s.status END;
UPDATE `Session` s SET bookedCount=(SELECT COALESCE(SUM(b.playerCount),0) FROM `Booking` b WHERE b.sessionId=s.id AND b.status IN ('joined','locked','finished','jumped'));
-- Never unlock historical confirmed bookings. Already-terminal sessions stay terminal.
UPDATE `Session` s SET status='locked' WHERE status IN ('draft','open','full') AND EXISTS(SELECT 1 FROM `Booking` b WHERE b.sessionId=s.id AND b.status='locked');
UPDATE `Session` SET status=IF(bookedCount>=capacity,'full','open') WHERE status IN ('open','full') OR (status='draft' AND bookedCount>0);
ALTER TABLE `Session` MODIFY status ENUM('draft','open','full','locked','running','finished','cancelled') NOT NULL DEFAULT 'draft', ADD CONSTRAINT Session_initiatorUserId_fkey FOREIGN KEY(initiatorUserId) REFERENCES `User`(id) ON DELETE RESTRICT;
ALTER TABLE `Booking` MODIFY status ENUM('joined','locked','finished','cancelled','jumped') NOT NULL DEFAULT 'joined';
ALTER TABLE `notifications` ADD href VARCHAR(255) NULL;
CREATE TABLE `SessionBackupDm` (
 sessionId BIGINT NOT NULL,dmId BIGINT NOT NULL,PRIMARY KEY(sessionId,dmId),
 CONSTRAINT SessionBackupDm_sessionId_fkey FOREIGN KEY(sessionId) REFERENCES `Session`(id) ON DELETE CASCADE,
 CONSTRAINT SessionBackupDm_dmId_fkey FOREIGN KEY(dmId) REFERENCES `Dm`(id) ON DELETE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `BookingRequest` (
 id BIGINT NOT NULL AUTO_INCREMENT,userId BIGINT NOT NULL,scriptId BIGINT NOT NULL,
 expectedTime DATETIME(3) NOT NULL,playerCount INTEGER NOT NULL,contactName VARCHAR(80) NOT NULL,contactPhone VARCHAR(32) NOT NULL,
 remark VARCHAR(500) NULL,status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',reviewerId BIGINT NULL,
 reviewedAt DATETIME(3) NULL,reason VARCHAR(500) NULL,sessionId BIGINT NULL,createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updatedAt DATETIME(3) NOT NULL,
 PRIMARY KEY(id),UNIQUE INDEX BookingRequest_sessionId_key(sessionId),INDEX BookingRequest_status_createdAt_idx(status,createdAt),INDEX BookingRequest_userId_createdAt_idx(userId,createdAt),
 CONSTRAINT BookingRequest_userId_fkey FOREIGN KEY(userId) REFERENCES `User`(id) ON DELETE RESTRICT,
 CONSTRAINT BookingRequest_scriptId_fkey FOREIGN KEY(scriptId) REFERENCES `Script`(id) ON DELETE RESTRICT,
 CONSTRAINT BookingRequest_reviewerId_fkey FOREIGN KEY(reviewerId) REFERENCES `User`(id) ON DELETE RESTRICT,
 CONSTRAINT BookingRequest_sessionId_fkey FOREIGN KEY(sessionId) REFERENCES `Session`(id) ON DELETE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
