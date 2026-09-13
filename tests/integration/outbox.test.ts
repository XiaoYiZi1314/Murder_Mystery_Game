/**
 * C1-T4 outbox 集成测试：员工写操作入队 → processOutboxBatch 投递站内通知（幂等）。
 * 前置：`npm run dev:test` 已启动（.env.test），测试库已 migrate + seed。
 */
import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { randomUUID } from "node:crypto";
import { Jar, api, cleanupTestUsers, ensureSeeded, getCsrf, trackPhone, uniquePhone } from "./helpers";

const BOSS_PHONE = "13800001002";
const BOSS_PASSWORD = "boss-password-1";

let ipSeq = 300;
function freshIp(): Record<string, string> {
  ipSeq += 1;
  return { "X-Forwarded-For": `10.99.9.${ipSeq}` };
}

const bossJar = new Jar();
let bossCsrf = "";

before(async () => {
  await ensureSeeded();
  const { hashPassword } = await import("../../src/server/auth/password");
  const { prisma } = await import("../../src/server/db/prisma");
  const passwordHash = await hashPassword(BOSS_PASSWORD);
  await prisma.user.upsert({
    where: { phone: BOSS_PHONE },
    update: { nickname: "测试店长B", passwordHash, role: "boss", status: "active" },
    create: { phone: BOSS_PHONE, nickname: "测试店长B", passwordHash, role: "boss", status: "active" },
  });
  trackPhone(BOSS_PHONE);
  const login = await api("/api/auth/login", {
    method: "POST",
    headers: freshIp(),
    jar: bossJar,
    body: { phone: BOSS_PHONE, password: BOSS_PASSWORD },
  });
  assert.equal(login.status, 200, `BOSS 登录期望 200，实际 ${login.status}：${JSON.stringify(login.json)}`);
  bossJar.capture(login.res);
  bossCsrf = await getCsrf(bossJar);
});

after(async () => {
  await cleanupTestUsers();
});

async function createStaffViaApi(role: "dm" | "manager", nickname: string) {
  const phone = trackPhone(uniquePhone());
  const { status, json } = await api("/api/admin/staff", {
    method: "POST",
    jar: bossJar,
    csrf: bossCsrf,
    headers: { "Idempotency-Key": randomUUID() },
    body: { phone, password: "staff-password-1", nickname, role },
  });
  assert.equal(status, 201, `建员工期望 201，实际 ${status}：${JSON.stringify(json)}`);
  return json.data;
}

test("建员工入队 staff.created，投递后通知 exactly-once", async () => {
  const { processOutboxBatch } = await import("../../src/server/notifications/dispatch");
  const { prisma } = await import("../../src/server/db/prisma");
  const staff = await createStaffViaApi("dm", "通知DM");
  const staffId = staff.id as string;

  const queued = await prisma.eventOutbox.findFirst({
    where: { type: "staff.created", status: "pending", payloadJson:{path:"$.userId",equals:staffId} },
    orderBy: { id: "desc" },
  });
  assert.ok(queued, "建员工应写入 outbox");

  const first = await processOutboxBatch(20, [queued.id]);
  assert.ok(first.delivered >= 1, `至少投递 1 条，实际 ${JSON.stringify(first)}`);

  const done = await prisma.eventOutbox.findUnique({ where: { id: queued.id } });
  assert.equal(done?.status, "delivered");
  assert.ok(done?.deliveredAt, "投递后应记录 deliveredAt");

  const notes = await prisma.notification.findMany({ where: { userId: BigInt(staffId), type: "staff.created" } });
  assert.equal(notes.length, 1);
  assert.equal(notes[0].title, "账号已开通");

  const second = await processOutboxBatch(20, [queued.id]);
  assert.equal(second.processed, 0, "已投递事件不应重复处理");
  const notesAgain = await prisma.notification.findMany({
    where: { userId: BigInt(staffId), type: "staff.created" },
  });
  assert.equal(notesAgain.length, 1, "重复投递不得产生第二条通知");
});

test("改密入队 staff.updated，投递通知员工", async () => {
  const { processOutboxBatch } = await import("../../src/server/notifications/dispatch");
  const { prisma } = await import("../../src/server/db/prisma");
  const staff = await createStaffViaApi("manager", "通知店员");
  const staffId = staff.id as string;

  const patched = await api(`/api/admin/staff/${staffId}`, {
    method: "PATCH",
    jar: bossJar,
    csrf: bossCsrf,
    headers: { "Idempotency-Key": randomUUID() },
    body: { new_password: "reset-pw-123" },
  });
  assert.equal(patched.status, 200);

  const events=await prisma.eventOutbox.findMany({where:{payloadJson:{path:"$.userId",equals:staffId}}});
  await processOutboxBatch(20,events.map(e=>e.id));
  const notes = await prisma.notification.findMany({ where: { userId: BigInt(staffId), type: "staff.updated" } });
  assert.ok(notes.length >= 1, "改密应投递 staff.updated 通知");
  assert.ok(notes.some((n) => n.title === "密码已被重置"), `应含改密通知，实际 ${JSON.stringify(notes.map((n) => n.title))}`);
});
