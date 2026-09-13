/**
 * C1-T2 认证与会话集成测试：注册/登录/双维限流/CSRF/登出/改昵称。
 * 前置：`npm run dev:test` 已启动（.env.test），测试库已 migrate + seed。
 * 限流口径：LOGIN_RATE_LIMIT_MAX=5（同 IP / 同手机号各 5 次，第 6 次 429）。
 */
import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { Jar, api, cleanupTestUsers, ensureSeeded, getCsrf, trackPhone, uniquePhone } from "./helpers";

const PASSWORD = "test-password-1";

let ipSeq = 100;
/** 每组用例独立 X-Forwarded-For，避免登录/IP 限流桶互相污染。 */
function freshIp(): Record<string, string> {
  ipSeq += 1;
  return { "X-Forwarded-For": `10.99.7.${ipSeq}` };
}

before(async () => {
  await ensureSeeded();
});

after(async () => {
  await cleanupTestUsers();
});

async function registerOk(ip: Record<string, string>, extraBody: Record<string, unknown> = {}) {
  const jar = new Jar();
  const phone = trackPhone(uniquePhone());
  const nickname = `雾客${phone.slice(-4)}`;
  const { status, json, res } = await api("/api/auth/register", {
    method: "POST",
    headers: ip,
    jar,
    body: { phone, password: PASSWORD, nickname, ...extraBody },
  });
  assert.equal(status, 201, `注册期望 201，实际 ${status}：${JSON.stringify(json)}`);
  assert.equal(json.code, 0);
  jar.capture(res);
  assert.ok(jar.cookie, "注册应下发会话 Cookie");
  return { jar, phone, nickname, me: json.data };
}

test("AC_C1_021 注册成功下发会话，默认 customer + 见雾", async () => {
  const { jar, phone, nickname, me } = await registerOk(freshIp());
  assert.equal(me.phone, phone);
  assert.equal(me.nickname, nickname);
  assert.equal(me.role, "customer");
  assert.equal(me.status, "active");
  assert.equal(typeof me.balance, "string");
  assert.equal(me.member_level?.rank, 1);
  assert.equal(me.member_level?.name, "见雾");
  assert.ok(!("passwordHash" in me) && !("password_hash" in me), "MeDto 不得泄露密码哈希");

  const got = await api("/api/me", { jar });
  assert.equal(got.status, 200);
  assert.equal(got.json.code, 0);
  assert.equal(got.json.data.id, me.id);
});

test("AC_C1_022 注册忽略 body.role，重复手机号 409", async () => {
  const ip = freshIp();
  const { me } = await registerOk(ip, { role: "boss" });
  assert.equal(me.role, "customer");

  const dup = await api("/api/auth/register", {
    method: "POST",
    headers: ip,
    body: { phone: me.phone, password: PASSWORD, nickname: "重复注册" },
  });
  assert.equal(dup.status, 409);
  assert.equal(dup.json.code, 3101);
});

test("注册输入非法返回 422 + 字段明细", async () => {
  const ip = freshIp();
  const badPhone = await api("/api/auth/register", {
    method: "POST",
    headers: ip,
    body: { phone: "12345", password: PASSWORD, nickname: "x" },
  });
  assert.equal(badPhone.status, 422);
  assert.equal(badPhone.json.code, 1001);
  assert.ok(badPhone.json.field_errors?.phone, "应返回 phone 字段明细");

  const shortPwd = await api("/api/auth/register", {
    method: "POST",
    headers: ip,
    body: { phone: uniquePhone(), password: "123", nickname: "x" },
  });
  assert.equal(shortPwd.status, 422);
  assert.equal(shortPwd.json.code, 1001);
});

test("AC_C1_023 登录成功建新会话；密码错/账号不存在统一 401/2004", async () => {
  const ip = freshIp();
  const { phone } = await registerOk(ip);

  const wrong = await api("/api/auth/login", {
    method: "POST",
    headers: ip,
    body: { phone, password: "wrong-password" },
  });
  assert.equal(wrong.status, 401);
  assert.equal(wrong.json.code, 2004);

  const ghost = await api("/api/auth/login", {
    method: "POST",
    headers: freshIp(),
    body: { phone: uniquePhone(), password: "wrong-password" },
  });
  assert.equal(ghost.status, wrong.status);
  assert.equal(ghost.json.code, wrong.json.code);
  assert.equal(ghost.json.message, wrong.json.message);

  const jar = new Jar();
  const ok = await api("/api/auth/login", {
    method: "POST",
    headers: ip,
    jar,
    body: { phone, password: PASSWORD },
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.code, 0);
  jar.capture(ok.res);
  assert.ok(jar.cookie, "登录应下发会话 Cookie");
});

test("AC_C1_024 五次失败后第 6 次即使密码正确也 429（fail-closed）", async () => {
  const ip = freshIp();
  const { phone } = await registerOk(freshIp());
  for (let i = 1; i <= 5; i += 1) {
    const r = await api("/api/auth/login", {
      method: "POST",
      headers: ip,
      body: { phone, password: "wrong-password" },
    });
    assert.equal(r.status, 401, `第 ${i} 次失败期望 401，实际 ${r.status}`);
  }
  const sixth = await api("/api/auth/login", {
    method: "POST",
    headers: ip,
    body: { phone, password: PASSWORD },
  });
  assert.equal(sixth.status, 429);
  assert.equal(sixth.json.code, 2003);
});

test("登录成功清零同手机号计数", async () => {
  const ip = freshIp();
  const { phone } = await registerOk(freshIp());
  for (let i = 0; i < 2; i += 1) {
    const r = await api("/api/auth/login", {
      method: "POST",
      headers: ip,
      body: { phone, password: "wrong-password" },
    });
    assert.equal(r.status, 401);
  }
  const ok = await api("/api/auth/login", { method: "POST", headers: ip, body: { phone, password: PASSWORD } });
  assert.equal(ok.status, 200);
  const again = await api("/api/auth/login", {
    method: "POST",
    headers: ip,
    body: { phone, password: "wrong-password" },
  });
  assert.equal(again.status, 401, "成功后计数清零，下一次失败仍应是 401 而非 429");
});

test("AC_C1_025 匿名取 CSRF 401；已登录写请求缺/错令牌 403", async () => {
  const anon = await api("/api/auth/csrf");
  assert.equal(anon.status, 401);
  assert.equal(anon.json.code, 2001);

  const { jar } = await registerOk(freshIp());
  const token = await getCsrf(jar);
  assert.ok(typeof token === "string" && token.length >= 32);

  const missing = await api("/api/me", { method: "PATCH", jar, body: { nickname: "无令牌" } });
  assert.equal(missing.status, 403);
  assert.equal(missing.json.code, 1002);

  const wrong = await api("/api/me", { method: "PATCH", jar, csrf: "wrong-token", body: { nickname: "错令牌" } });
  assert.equal(wrong.status, 403);
  assert.equal(wrong.json.code, 1002);

  const ok = await api("/api/me", { method: "PATCH", jar, csrf: token, body: { nickname: "有雾了" } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.data.nickname, "有雾了");

  const got = await api("/api/me", { jar });
  assert.equal(got.json.data.nickname, "有雾了");
});

test("PATCH /me 只读字段 422；登出后会话失效", async () => {
  const { jar } = await registerOk(freshIp());
  const token = await getCsrf(jar);

  const forbidden = await api("/api/me", {
    method: "PATCH",
    jar,
    csrf: token,
    body: { nickname: "改名", role: "boss", balance: "9999.00" },
  });
  assert.equal(forbidden.status, 422);
  assert.equal(forbidden.json.code, 1001);
  assert.ok(forbidden.json.field_errors?.role, "应列出 role 只读");

  const out = await api("/api/auth/logout", { method: "POST", jar, csrf: token, body: {} });
  assert.equal(out.status, 200);
  assert.equal(out.json.data.signed_out, true);
  const cleared = out.res.headers.get("set-cookie") ?? "";
  assert.ok(cleared.includes("Max-Age=0"), "登出应清 Cookie");

  const gone = await api("/api/me", { jar });
  assert.equal(gone.status, 401);
});

test("匿名写请求缺 Origin 403", async () => {
  const r = await api("/api/auth/login", {
    method: "POST",
    origin: null,
    headers: freshIp(),
    body: { phone: uniquePhone(), password: PASSWORD },
  });
  assert.equal(r.status, 403);
  assert.equal(r.json.code, 1003);
});
