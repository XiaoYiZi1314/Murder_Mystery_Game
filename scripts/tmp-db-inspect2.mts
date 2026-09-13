// 一次性排查脚本：检查测试库迁移与现有内容数据（C2 开工前基线）。
import { loadEnvFile } from "../src/server/config";
loadEnvFile(".env.test");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.REDIS_URL = process.env.TEST_REDIS_URL;
const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const json = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x));
const migrations = (await db.$queryRawUnsafe("SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at")) as { migration_name: string; finished_at: Date | null }[];
console.log("migrations:");
for (const m of migrations) console.log("  " + m.migration_name + " finished=" + (m.finished_at ? "yes" : "NO"));
const rawTables = (await db.$queryRawUnsafe("SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY TABLE_NAME")) as { TABLE_NAME: string }[];
for (const t of rawTables) {
  const name = t.TABLE_NAME;
  if (!name) continue;
  const c = (await db.$queryRawUnsafe("SELECT COUNT(*) AS n FROM " + name)) as { n: bigint }[];
  console.log("table " + name + ": " + (c[0]?.n ?? "?") + " rows");
}
const scripts = (await db.$queryRawUnsafe("SELECT id, slug, title, status FROM script LIMIT 10")) as Record<string, unknown>[];
console.log("script sample:", json(scripts));
const users = (await db.$queryRawUnsafe("SELECT id, nickname, role FROM user LIMIT 12")) as Record<string, unknown>[];
console.log("user sample:", json(users));
await db.$disconnect();
