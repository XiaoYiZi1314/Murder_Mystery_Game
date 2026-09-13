import { loadEnvFile } from "../src/server/config";
import { closePrisma, prisma } from "../src/server/db/prisma";

loadEnvFile(".env.test");

async function main() {
  const rows = await prisma.costume.findMany({ select: { id: true, name: true, status: true, coverUrl: true } });
  console.log("costumes:", JSON.stringify(rows));
  const scripts = await prisma.script.findMany({ select: { id: true, title: true, status: true } });
  console.log("scripts:", JSON.stringify(scripts));
}

main().then(() => closePrisma()).catch((e) => { console.error("fail:", e); process.exit(1); });
