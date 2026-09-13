// 由父进程注入 DATABASE_URL（测试库）后执行
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pending = await prisma.eventOutbox.findMany({ where: { status: "pending" } });
  const deadIds: bigint[] = [];
  for (const row of pending) {
    const payload = (row.payloadJson ?? {}) as { userId?: string };
    const hasUserId = typeof payload.userId === "string" && /^\d+$/.test(payload.userId);
    if (!hasUserId) {
      // 无 userId 的 pending（catalog.changed 等测试残留）：直接清。
      deadIds.push(row.id);
      continue;
    }
    const user = await prisma.user.findUnique({ where: { id: BigInt(payload.userId) }, select: { id: true } });
    if (!user) deadIds.push(row.id);
  }
  let deleted = 0;
  if (deadIds.length > 0) deleted = (await prisma.eventOutbox.deleteMany({ where: { id: { in: deadIds } } })).count;
  const left = await prisma.eventOutbox.groupBy({ by: ["status"], _count: { _all: true } });
  console.log(`deleted stale: ${deleted}; outbox by status: ${JSON.stringify(left)}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error("fail:", e); process.exit(1); });
