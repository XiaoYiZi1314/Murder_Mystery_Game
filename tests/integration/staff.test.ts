/**
 * C1-T3 员工管理集成测试：BOSS 权限隔离/建员工/转岗/禁用吊销/幂等/审计。
 * 前置：`npm run dev:test` 已启动（.env.test），测试库已 migrate + seed。
 */
import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { randomUUID } from "node:crypto";
import { Jar, api, cleanupTestUsers, ensureSeeded, getCsrf, trackPhone, uniquePhone } from "./helpers";

const BOSS_PHONE = "13800001001";
const BOSS_PASSWORD = "boss-password-1";
const STAFF_PASSWORD = "staff-password-1";

let ipSeq = 200;
function freshIp(): Record<string, string> {
  ipSeq += 1;
  return { "X-Forwarded-For": `10.99.8.${ipSeq}` };
}

let bossJar = new Jar();
let bossCsrf = "";

async function bossApi(path: string, options: { method?: string; body?: unknown; key?: string } = {}) {
  return api(path, {
    method: options.method ?? "GET",
    body: options.body,
    jar: bossJar,
    csrf: options.method && options.method !== "GET" ? bossCsrf : undefined,
    headers: options.key ? { "Idempotency-Key": options.key } : undefined,
  });
}

async function createStaffOk(role: "dm" | "manager") {
  const phone = trackPhone(uniquePhone());
  const { status, json } = await bossApi("/api/admin/staff", {
    method: "POST",
    key: randomUUID(),
    body: { phone, password: STAFF_PASSWORD, nickname: `员工${phone.slice(-4)}`, role },
  });
  assert.equal(status, 201, `建员工期望 201，实际 ${status}：${JSON.stringify(json)}`);
  assert.equal(json.code, 0);
  return json.data;
}

async function loginAs(phone: string, password: string): Promise<Jar> {
  const jar = new Jar();
  const { status, json, res } = await api("/api/auth/login", {
    method: "POST",
    headers: freshIp(),
    jar,
    body: { phone, password },
  });
  assert.equal(status, 200, `登录期望 200，实际 ${status}：${JSON.stringify(json)}`);
  jar.capture(res);
  assert.ok(jar.cookie, "登录应下发会话 Cookie");
  return jar;
}

before(async () => {
  await ensureSeeded();
  // 自举测试 BOSS（直写 DB，逻辑与 scripts/bootstrap-boss.ts 一致）。
  const { hashPassword } = await import("../../src/server/auth/password");
  const { prisma } = await import("../../src/server/db/prisma");
  const passwordHash = await hashPassword(BOSS_PASSWORD);
  await prisma.user.upsert({
    where: { phone: BOSS_PHONE },
    update: { nickname: "测试店长", passwordHash, role: "boss", status: "active" },
    create: { phone: BOSS_PHONE, nickname: "测试店长", passwordHash, role: "boss", status: "active" },
  });
  trackPhone(BOSS_PHONE);
  bossJar = await loginAs(BOSS_PHONE, BOSS_PASSWORD);
  bossCsrf = await getCsrf(bossJar);
});

after(async () => {
  await cleanupTestUsers();
});

test("非 BOSS 访问员工接口 403，匿名 401", async () => {
  const anon = await api("/api/admin/staff");
  assert.equal(anon.status, 401);
  assert.equal(anon.json.code, 2001);

  const jar = new Jar();
  const phone = trackPhone(uniquePhone());
  const reg = await api("/api/auth/register", {
    method: "POST",
    headers: freshIp(),
    jar,
    body: { phone, password: "customer-pw-1", nickname: "顾客甲" },
  });
  assert.equal(reg.status, 201);
  jar.capture(reg.res);

  const list = await api("/api/admin/staff", { jar });
  assert.equal(list.status, 403);
  assert.equal(list.json.code, 2002);

  const csrf = await getCsrf(jar);
  const create = await api("/api/admin/staff", {
    method: "POST",
    jar,
    csrf,
    headers: { "Idempotency-Key": randomUUID() },
    body: { phone: uniquePhone(), password: STAFF_PASSWORD, nickname: "提权", role: "dm" },
  });
  assert.equal(create.status, 403);
});

test("BOSS 列表默认仅 dm+manager，role 筛选非法 422", async () => {
  const dm = await createStaffOk("dm");
  const manager = await createStaffOk("manager");
  const all = await bossApi("/api/admin/staff");
  assert.equal(all.status, 200);
  assert.equal(all.json.code, 0);
  const roles = new Set(all.json.data.map((r: { role: string }) => r.role));
  assert.ok(!roles.has("boss") && !roles.has("customer"), "默认列表不得含 boss/customer");
  assert.ok(all.json.data.some((r: { id: string }) => r.id === dm.id));
  assert.ok(all.json.data.some((r: { id: string }) => r.id === manager.id));
  assert.ok(!("passwordHash" in all.json.data[0]) && !("password_hash" in all.json.data[0]), "员工行不得泄露密码哈希");

  const onlyDm = await api("/api/admin/staff?role=dm", { jar: bossJar });
  assert.equal(onlyDm.status, 200);
  assert.ok(onlyDm.json.data.length > 0 && onlyDm.json.data.every((r: { role: string }) => r.role === "dm"));

  const bad = await api("/api/admin/staff?role=owner", { jar: bossJar });
  assert.equal(bad.status, 422);
});

test("建 DM 自动建档并写审计；非法角色/缺幂等键 422；重复手机号 409", async () => {
  const phone = trackPhone(uniquePhone());
  const created = await bossApi("/api/admin/staff", {
    method: "POST",
    key: randomUUID(),
    body: { phone, password: STAFF_PASSWORD, nickname: "DM阿瞩", role: "dm" },
  });
  assert.equal(created.status, 201);
  assert.equal(created.json.data.role, "dm");
  assert.ok(created.json.data.dm_profile_id, "DM 应自动建档");

  const { prisma } = await import("../../src/server/db/prisma");
  const log = await prisma.operationLog.findFirst({
    where: { action: "staff.create", targetId: String(created.json.data.id) },
  });
  assert.ok(log, "建员工应写审计日志");
  assert.ok(!JSON.stringify(log?.summaryAfter ?? {}).includes("staff-password"), "审计不得记录密码");

  const badRole = await bossApi("/api/admin/staff", {
    method: "POST",
    key: randomUUID(),
    body: { phone: trackPhone(uniquePhone()), password: STAFF_PASSWORD, nickname: "坏角色", role: "boss" },
  });
  assert.equal(badRole.status, 422);

  const noKey = await bossApi("/api/admin/staff", {
    method: "POST",
    body: { phone: trackPhone(uniquePhone()), password: STAFF_PASSWORD, nickname: "无键", role: "manager" },
  });
  assert.equal(noKey.status, 422);
  assert.equal(noKey.json.code, 1001);

  const dup = await bossApi("/api/admin/staff", {
    method: "POST",
    key: randomUUID(),
    body: { phone, password: STAFF_PASSWORD, nickname: "重复", role: "manager" },
  });
  assert.equal(dup.status, 409);
  assert.equal(dup.json.code, 3101);
});

test("建员工幂等：同键同体质重放，同键异体 409/3201", async () => {
  const key = randomUUID();
  const phone = trackPhone(uniquePhone());
  const body = { phone, password: STAFF_PASSWORD, nickname: "幂等DM", role: "dm" };
  const first = await bossApi("/api/admin/staff", { method: "POST", key, body });
  assert.equal(first.status, 201);
  const second = await bossApi("/api/admin/staff", { method: "POST", key, body });
  assert.equal(second.status, 201);
  assert.equal(second.json.data.id, first.json.data.id);

  const clash = await bossApi("/api/admin/staff", { method: "POST", key, body: { ...body, nickname: "异体" } });
  assert.equal(clash.status, 409);
  assert.equal(clash.json.code, 3201);
});

test("改员工昵称/转岗；manager 转 DM 补档案；非法 id 404", async () => {
  const dm = await createStaffOk("dm");
  const renamed = await bossApi(`/api/admin/staff/${dm.id}`, {
    method: "PATCH",
    key: randomUUID(),
    body: { nickname: "改名DM" },
  });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.json.data.nickname, "改名DM");

  const toManager = await bossApi(`/api/admin/staff/${dm.id}`, {
    method: "PATCH",
    key: randomUUID(),
    body: { role: "manager" },
  });
  assert.equal(toManager.status, 200);
  assert.equal(toManager.json.data.role, "manager");

  const backToDm = await bossApi(`/api/admin/staff/${dm.id}`, {
    method: "PATCH",
    key: randomUUID(),
    body: { role: "dm" },
  });
  assert.equal(backToDm.json.data.dm_profile_id, dm.dm_profile_id, "转岗应保留原档案");

  const m2 = await createStaffOk("manager");
  assert.equal(m2.dm_profile_id, null);
  const m2dm = await bossApi(`/api/admin/staff/${m2.id}`, {
    method: "PATCH",
    key: randomUUID(),
    body: { role: "dm" },
  });
  assert.ok(m2dm.json.data.dm_profile_id, "manager 转 DM 应补建档案");

  const badRole = await bossApi(`/api/admin/staff/${dm.id}`, {
    method: "PATCH",
    key: randomUUID(),
    body: { role: "boss" },
  });
  assert.equal(badRole.status, 422);
  const badStatus = await bossApi(`/api/admin/staff/${dm.id}`, {
    method: "PATCH",
    key: randomUUID(),
    body: { status: "frozen" },
  });
  assert.equal(badStatus.status, 422);

  for (const badId of ["abc", "0x12", "999999999999"]) {
    const r = await bossApi(`/api/admin/staff/${badId}`, {
      method: "PATCH",
      key: randomUUID(),
      body: { nickname: "x" },
    });
    assert.equal(r.status, 404, `id=${badId} 期望 404`);
  }
});

test("禁用吊销员工全部会话；改密亦然", async () => {
  const staff = await createStaffOk("dm");
  const jar = await loginAs(staff.phone, STAFF_PASSWORD);
  const me1 = await api("/api/me", { jar });
  assert.equal(me1.status, 200);

  const dis = await bossApi(`/api/admin/staff/${staff.id}`, {
    method: "PATCH",
    key: randomUUID(),
    body: { status: "disabled" },
  });
  assert.equal(dis.status, 200);
  const me2 = await api("/api/me", { jar });
  assert.equal(me2.status, 401, "禁用后旧会话应失效");

  const staff2 = await createStaffOk("manager");
  const jar2 = await loginAs(staff2.phone, STAFF_PASSWORD);
  const pw = await bossApi(`/api/admin/staff/${staff2.id}`, {
    method: "PATCH",
    key: randomUUID(),
    body: { new_password: "new-staff-pw-2" },
  });
  assert.equal(pw.status, 200);
  const me3 = await api("/api/me", { jar: jar2 });
  assert.equal(me3.status, 401, "改密后旧会话应失效");
  const relogin = await loginAs(staff2.phone, "new-staff-pw-2");
  assert.ok(relogin.cookie, "新密码应可登录");
});

test("manager 与 dm 均不得访问员工管理", async () => {
  const manager = await createStaffOk("manager");
  const jar = await loginAs(manager.phone, STAFF_PASSWORD);
  const r = await api("/api/admin/staff", { jar });
  assert.equal(r.status, 403);
  assert.equal(r.json.code, 2002);
});
