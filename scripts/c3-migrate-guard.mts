import { loadEnvFile } from "../src/server/config";
import { PrismaClient } from "@prisma/client";
loadEnvFile();
const db = new PrismaClient();
try {
  const [{ name }] = await db.$queryRaw<
    { name: string }[]
  >`SELECT DATABASE() AS name`;
  const applied = await db.$queryRaw<
    { migration_name: string }[]
  >`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  if (
    !applied.some((x) => x.migration_name === "20260913143000_booking_sessions")
  ) {
    const bad = await db.$queryRaw<
      { id: bigint }[]
    >`SELECT s.id FROM Session s WHERE s.capacity<1 OR s.capacity>100 OR s.capacity<(SELECT COALESCE(SUM(b.playerCount),0) FROM Booking b WHERE b.sessionId=s.id AND b.status<>'cancelled') OR EXISTS(SELECT 1 FROM Booking b WHERE b.sessionId=s.id AND b.playerCount<1)`;
    if (bad.length)
      throw new Error(
        "C3 migration blocked: invalid historical capacity; reconcile with an audited backup before conversion.",
      );
    if (name !== "shisanwu_test" && process.env.C3_MIGRATION_CONFIRMED !== name)
      throw new Error(
        "C3 migration requires backup, stopped writers, restored-copy rehearsal and C3_MIGRATION_CONFIRMED=<exact database>. See docs/c3-verification.md.",
      );
    console.log(
      "C3 migration preflight passed; legacy statuses are archived, no reset.",
    );
  }
} finally {
  await db.$disconnect();
}
