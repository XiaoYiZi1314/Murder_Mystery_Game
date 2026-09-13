/**
 * Outbox 投递 worker：轮询 event_outbox → 站内通知。
 * 运行：npm run dev:worker（开发热重载）；生产由进程管理常驻单实例。
 */
import { closeRedis } from "../server/db/redis";
import { loadEnvFile } from "../server/config";
import { closePrisma } from "../server/db/prisma";
import { processOutboxBatch } from "../server/notifications/dispatch";

loadEnvFile(".env");

const POLL_MS = Number(process.env.OUTBOX_POLL_MS ?? 5000);
const BATCH = Number(process.env.OUTBOX_BATCH_SIZE ?? 20);

let stopped = false;

async function tick(): Promise<void> {
  try {
    const result = await processOutboxBatch(BATCH);
    if (result.processed > 0) {
      console.log(
        `[outbox-worker] processed=${result.processed} delivered=${result.delivered} dead=${result.dead}`,
      );
    }
  } catch (error: unknown) {
    console.error("[outbox-worker] 轮询失败：", error);
  }
  if (!stopped) setTimeout(() => void tick(), POLL_MS);
}

async function shutdown(signal: string): Promise<void> {
  stopped = true;
  await closePrisma();
  await closeRedis();

  console.log(`[outbox-worker] 收到 ${signal}，已退出`);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

console.log(`[outbox-worker] 启动（poll=${POLL_MS}ms batch=${BATCH}）`);
void tick();
