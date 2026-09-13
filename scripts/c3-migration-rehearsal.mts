/** Exercise the real C3 SQL on disposable, namespaced C1/C2 tables; never reset or touch existing tables. */
import "../tests/integration/helpers";
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PrismaClient(),
  prefix = `c3r_${Date.now()}_`;
const paths = [
  "prisma/migrations/20260912015828_init/migration.sql",
  "prisma/upgrade/c2-safe.sql",
  "prisma/migrations/20260913143000_booking_sessions/migration.sql",
];
const sources = await Promise.all(paths.map((p) => readFile(p, "utf8")));
const tables = [
    ...new Set(
      sources.flatMap((s) =>
        [...s.matchAll(/CREATE TABLE `([^`]+)`/g)].map((m) => m[1]),
      ),
    ),
  ],
  known = new Set(tables);
function rewrite(text: string) {
  return text.replace(
    /`([a-zA-Z0-9_]+)`|\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g,
    (full, quoted, bare) => {
      const name = quoted ?? bare;
      return known.has(name) || name.endsWith("_fkey")
        ? `\`${prefix}${name}\``
        : full;
    },
  );
}
async function execute(sql: string) {
  return db.$executeRawUnsafe(rewrite(sql));
}
async function query<T>(sql: string) {
  return db.$queryRawUnsafe<T>(rewrite(sql));
}
async function run(source: string) {
  for (const stmt of source
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean))
    await execute(stmt);
}
let allowed = false;
try {
  const [{ name }] = await db.$queryRaw<
    { name: string }[]
  >`SELECT DATABASE() AS name`;
  if (name !== "shisanwu_test") throw new Error("Refuse non-test database");
  allowed = true;
  await run(sources[0]);
  await execute(
    "INSERT INTO Script(id,slug,title,coverUrl,synopsis,durationMinutes,minPlayers,maxPlayers,difficulty,pricePerPlayer,status,updatedAt) VALUES(1,'legacy-c3','旧剧本','/original.jpg','原简介',180,4,6,'beginner',168,'published',NOW(3))",
  );
  await execute(
    "INSERT INTO User(id,phone,nickname,passwordHash,role,status,updatedAt) VALUES(1,'13800000001','原联系人','test','customer','active',NOW(3))",
  );
  for (const [i, status, bookingStatus, count] of [
    [1, "scheduled", "pending", 2],
    [2, "open", "confirmed", 3],
    [3, "completed", "completed", 1],
    [4, "cancelled", "cancelled", 1],
  ] as const) {
    await execute(
      `INSERT INTO Session(id,scriptId,startsAt,endsAt,roomName,capacity,status,updatedAt) VALUES(${i},1,DATE_ADD(NOW(3),INTERVAL 7 DAY),DATE_ADD(NOW(3),INTERVAL 8 DAY),'旧房间',6,'${status}',NOW(3))`,
    );
    await execute(
      `INSERT INTO Booking(bookingNo,userId,sessionId,playerCount,totalAmount,status,updatedAt) VALUES('legacy-${i}',1,${i},${count},${168 * count},'${bookingStatus}',NOW(3))`,
    );
  }
  await run(sources[1]);
  await run(sources[2]);
  const sessions = await query<
    {
      id: bigint;
      status: string;
      bookedCount: number;
      roomName: string;
      pricePerPlayer: unknown;
    }[]
  >(
    "SELECT id,status,bookedCount,roomName,pricePerPlayer FROM Session ORDER BY id",
  );
  assert.deepEqual(
    sessions.map((s) => s.status),
    ["open", "locked", "finished", "cancelled"],
  );
  assert.deepEqual(
    sessions.map((s) => s.bookedCount),
    [2, 3, 1, 0],
  );
  assert.ok(
    sessions.every(
      (s) => s.roomName === "旧房间" && String(s.pricePerPlayer) === "168",
    ),
  );
  const bookings = await query<
    {
      status: string;
      contactName: string;
      contactPhone: string;
      totalAmount: unknown;
    }[]
  >(
    "SELECT status,contactName,contactPhone,totalAmount FROM Booking ORDER BY id",
  );
  assert.deepEqual(
    bookings.map((b) => b.status),
    ["joined", "locked", "finished", "cancelled"],
  );
  assert.equal(bookings[0].contactName, "原联系人");
  assert.equal(bookings[0].contactPhone, "13800000001");
  assert.equal(String(bookings[0].totalAmount), "336");
  assert.equal(
    (await query<unknown[]>("SELECT * FROM c3_legacy_sessions")).length,
    4,
  );
  assert.equal(
    (await query<unknown[]>("SELECT * FROM c3_legacy_bookings")).length,
    4,
  );
  const [script] = await query<{ slug: string; coverUrl: string }[]>(
    "SELECT slug,coverUrl FROM Script",
  );
  assert.equal(script.slug, "legacy-c3");
  assert.equal(script.coverUrl, "/original.jpg");
  console.log(
    "PASS C3 migration: 4 legacy states/bookings, occupied counts, locked protection, contact snapshots, original amounts/rooms/slug/cover and both archives preserved.",
  );
} finally {
  if (allowed) {
    const refs = await db.$queryRaw<
      { TABLE_NAME: string; REFERENCED_TABLE_NAME: string | null }[]
    >`SELECT TABLE_NAME,REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL`;
    const remaining = new Set(tables.map((t) => prefix + t));
    while (remaining.size) {
      const next = [...remaining].find(
        (t) =>
          !refs.some(
            (r) =>
              r.REFERENCED_TABLE_NAME?.toLowerCase() === t.toLowerCase() &&
              [...remaining].some(
                (x) => x.toLowerCase() === r.TABLE_NAME.toLowerCase(),
              ) &&
              r.TABLE_NAME.toLowerCase() !== t.toLowerCase(),
          ),
      );
      if (!next)
        throw new Error(
          "Unexpected isolated-table dependency cycle; inspect " + prefix,
        );
      await db.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${next}\``);
      remaining.delete(next);
    }
    console.log("Removed only isolated rehearsal tables:", prefix);
  }
  await db.$disconnect();
}
