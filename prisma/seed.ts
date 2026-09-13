/**
 * C1 种子：五级会员（幂等 upsert，连跑两次无重复；不含任何账号与演示金额）。
 * 运行：npm run prisma:seed（DATABASE_URL 来自 .env）。
 */
import { Prisma } from "@prisma/client";
import { loadEnvFile } from "../src/server/config";
import { closePrisma, prisma } from "../src/server/db/prisma";

export const MEMBER_LEVEL_SEED = [
  { code: "jian_wu", name: "见雾", rank: 1, topupThreshold: "0" },
  { code: "wang_yao", name: "望遥", rank: 2, topupThreshold: "500" },
  { code: "qi_yue", name: "栖月", rank: 3, topupThreshold: "1500" },
  { code: "shu_jin", name: "书烬", rank: 4, topupThreshold: "3000" },
  { code: "yun_ying", name: "云影", rank: 5, topupThreshold: "6000" },
] as const;

export async function seedMemberLevels(): Promise<number> {
  for (const level of MEMBER_LEVEL_SEED) {
    await prisma.memberLevel.upsert({
      where: { code: level.code },
      update: {},
      create: {
        code: level.code,
        name: level.name,
        rank: level.rank,
        topupThreshold: new Prisma.Decimal(level.topupThreshold),
      },
    });
  }
  return MEMBER_LEVEL_SEED.length;
}

async function main(): Promise<void> {
  loadEnvFile(".env");
  const count = await seedMemberLevels();
   
  console.log(`[seed] member_levels upsert ok: ${count} levels`);
}

const invokedDirectly = (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("prisma/seed.ts");
if (invokedDirectly) {
  main()
    .then(() => closePrisma())
    .catch(async (error: unknown) => {
       
      console.error("[seed] failed:", error instanceof Error ? error.message : error);
      await closePrisma();
      process.exit(1);
    });
}
