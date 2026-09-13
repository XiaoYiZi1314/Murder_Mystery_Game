import { loadEnvFile } from "../src/server/config";
import { closePrisma, prisma } from "../src/server/db/prisma";

loadEnvFile(".env.test");

async function main() {
  // 造一个剧本用于探测
  const s = await prisma.script.create({
    data: {
      slug: `probe-${Date.now().toString(36)}`,
      title: "探测脚本",
      coverUrl: "/assets/cover-placeholder.webp",
      synopsis: "probe",
      durationMinutes: 120,
      minPlayers: 2,
      maxPlayers: 4,
      pricePerPlayer: new (await import("@prisma/client")).Prisma.Decimal("1.00"),
      status: "draft",
    },
  });
  console.log("created id:", s.id.toString());
  try {
    const res = await prisma.script.updateMany({ where: { id: s.id }, data: {} as never });
    console.log("empty-data updateMany ok, count:", res.count);
  } catch (e) {
    console.log("empty-data updateMany THREW:", (e as Error).message?.slice(0, 300));
  }
  await prisma.script.delete({ where: { id: s.id } });
  console.log("cleaned");
}

main().then(() => closePrisma()).catch((e) => { console.error("fail:", e); process.exit(1); });
