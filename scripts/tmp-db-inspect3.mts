import { loadEnvFile } from "../src/server/config";
import { closePrisma, prisma } from "../src/server/db/prisma";

loadEnvFile(".env");

async function main() {
  const db: string = (await prisma.$queryRawUnsafe(`SELECT DATABASE() AS db`))[0] as { db: string };
  console.log("database:", db);
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME`,
  )) as { TABLE_NAME: string; TABLE_ROWS: number }[];
  for (const r of rows) console.log(`${r.TABLE_NAME}: ${r.TABLE_ROWS}`);
  const scripts = (await prisma.$queryRawUnsafe(`SELECT id, slug, title, status, difficulty FROM script LIMIT 5`)) as unknown[];
  console.log("script sample:", JSON.stringify(scripts));
}

main()
  .then(() => closePrisma())
  .catch((e) => {
    console.error("inspect failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
