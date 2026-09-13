/**
 * BOSS 自举：首次部署创建店长账号（按手机号 upsert，幂等可重跑）。
 * 用法：$env:BOSS_PHONE="138...."; $env:BOSS_PASSWORD="..."; npm run bootstrap:boss
 */
import { hashPassword } from "../src/server/auth/password";
import { loadEnvFile } from "../src/server/config";
import { closePrisma, prisma } from "../src/server/db/prisma";

loadEnvFile(".env");

async function main(): Promise<void> {
  const phone = (process.env.BOSS_PHONE ?? "").trim();
  const password = process.env.BOSS_PASSWORD ?? "";
  const nickname = (process.env.BOSS_NICKNAME ?? "").trim() || "十三雾店长";
  if (!/^1[3-9]\d{9}$/.test(phone)) throw new Error("[bootstrap:boss] BOSS_PHONE 非法，需为 11 位大陆手机号");
  if (password.length < 6 || password.length > 72) throw new Error("[bootstrap:boss] BOSS_PASSWORD 需为 6–72 位");
  const passwordHash = await hashPassword(password);
  const boss = await prisma.user.upsert({
    where: { phone },
    update: { nickname, passwordHash, role: "boss", status: "active" },
    create: { phone, nickname, passwordHash, role: "boss", status: "active" },
  });
   
  console.log(`[bootstrap:boss] ok id=${boss.id} phone=${boss.phone} role=${boss.role}`);
}

main()
  .catch((error: unknown) => {
     
    console.error("[bootstrap:boss] 失败：", error);
    process.exitCode = 1;
  })
  .finally(() => closePrisma());
