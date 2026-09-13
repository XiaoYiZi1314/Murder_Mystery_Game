/** Run with the other test worker stopped. Starts/stops only its own child workers. */
import "../tests/integration/helpers";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { prisma } from "../src/server/db/prisma";
import { closeRedis } from "../src/server/db/redis";
import {
  trackPhone,
  uniquePhone,
  cleanupTestUsers,
} from "../tests/integration/helpers";
const [{ name }] = await prisma.$queryRaw<
  { name: string }[]
>`SELECT DATABASE() AS name`;
if (name !== "shisanwu_test") throw new Error("Refuse non-test database");
const children: ChildProcess[] = [],
  events: bigint[] = [];
function start() {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "src/worker/outbox-worker.ts"],
    {
      env: { ...process.env, OUTBOX_POLL_MS: "100" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout?.on("data", (d) => process.stdout.write(d));
  child.stderr?.on("data", (d) => process.stderr.write(d));
  children.push(child);
  return child;
}
async function stop(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exit = once(child, "exit");
  child.kill("SIGTERM");
  await exit;
}
async function delivered(eid: bigint) {
  for (let i = 0; i < 100; i++) {
    if (
      (await prisma.eventOutbox.findUniqueOrThrow({ where: { id: eid } }))
        .status === "delivered"
    )
      return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Worker failed to deliver " + eid);
}
try {
  const user = await prisma.user.create({
    data: {
      phone: trackPhone(uniquePhone()),
      nickname: "C3重启验证",
      passwordHash: "test-only",
      role: "customer",
    },
  });
  async function queue() {
    const e = await prisma.eventOutbox.create({
      data: {
        type: "booking_request.approved",
        payloadJson: {
          actorUserId: user.id.toString(),
          subjectId: "restart-fixture",
          recipientUserIds: [user.id.toString()],
          player_count: 3,
        },
      },
    });
    events.push(e.id);
    return e.id;
  }
  const first = await queue(),
    worker1 = start();
  await delivered(first);
  await stop(worker1);
  const second = await queue();
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(
    (await prisma.eventOutbox.findUniqueOrThrow({ where: { id: second } }))
      .status,
    "pending",
    "No unrelated worker should be running for this check",
  );
  const worker2 = start();
  await delivered(second);
  await prisma.eventOutbox.update({
    where: { id: first },
    data: { status: "pending", nextRetryAt: null },
  });
  const worker3 = start();
  await delivered(first);
  await stop(worker2);
  await stop(worker3);
  assert.equal(
    await prisma.notification.count({
      where: {
        eventId: { in: events.map((e) => `outbox:${e}`) },
        userId: user.id,
      },
    }),
    2,
  );
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/c3-worker-restart.json",
    JSON.stringify(
      {
        stopped_pending_preserved: true,
        restart_delivered: true,
        duplicate_multi_consumer_deduplicated: true,
        events: 2,
        notifications: 2,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: worker stopped/pending retained/restarted/delivered; two consumers replay => exactly two notifications for two events.",
  );
} finally {
  for (const child of children) await stop(child);
  await prisma.notification.deleteMany({
    where: { eventId: { in: events.map((e) => `outbox:${e}`) } },
  });
  await prisma.eventOutbox.deleteMany({ where: { id: { in: events } } });
  await cleanupTestUsers();
  await closeRedis();
  await prisma.$disconnect();
}
