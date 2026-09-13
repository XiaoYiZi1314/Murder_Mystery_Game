-- Additive canonical slugs. Preserve old shared links only when source name is unambiguous.
ALTER TABLE `Costume` ADD COLUMN `slug` VARCHAR(191) NULL, ADD UNIQUE INDEX `Costume_slug_key` (`slug`);
ALTER TABLE `Dm` ADD COLUMN `slug` VARCHAR(191) NULL, ADD UNIQUE INDEX `Dm_slug_key` (`slug`);
UPDATE `Costume` c JOIN (SELECT name, MIN(id) AS id FROM `Costume` GROUP BY name HAVING COUNT(*)=1) one ON c.id=one.id
SET c.slug=CASE c.name WHEN '雾港旧衣' THEN 'wugang-old' WHEN '寄信人的房间' THEN 'letter-room' WHEN '长安行旅' THEN 'chang-an' ELSE NULL END;
UPDATE `Dm` d JOIN `User` u ON d.userId=u.id JOIN (SELECT nickname, MIN(id) AS id FROM `User` GROUP BY nickname HAVING COUNT(*)=1) one ON u.id=one.id
SET d.slug=CASE u.nickname WHEN '林深' THEN 'linshen' WHEN '阿渡' THEN 'adu' WHEN '十三' THEN 'shisan' ELSE NULL END;
