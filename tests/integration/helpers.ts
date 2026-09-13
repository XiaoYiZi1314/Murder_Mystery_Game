/**
 * C1 集成测试 harness：.env.test 加载、测试隔离自检、HTTP/Cookie/CSRF 工具、数据清理。
 * 运行前需：测试库已 `prisma migrate deploy`；本机 `npm run dev` 已启动（默认 http://localhost:3000）。
 */
import assert from "node:assert/strict";
import { loadEnvFile } from "../../src/server/config";

loadEnvFile(".env.test");

const mapping = [
  ["TEST_DATABASE_URL", "DATABASE_URL"],
  ["TEST_REDIS_URL", "REDIS_URL"],
  ["TEST_REDIS_PREFIX", "REDIS_PREFIX"],
] as const;
for (const [from, to] of mapping) {
  if (process.env[from]) process.env[to] = process.env[from];
}

function maskDbUrl(url: string): string {
  return url.replace(/:\/\/[^@]+@/, "://***@");
}

// ---- 隔离自检：测试只能打测试库/测试前缀 ----
const dbUrl = process.env.DATABASE_URL ?? "";
if (!dbUrl.includes("shisanwu_test")) {
  throw new Error(`[test-harness] 拒绝运行：DATABASE_URL 未指向 shisanwu_test（${maskDbUrl(dbUrl)}）`);
}
if (!(process.env.REDIS_PREFIX ?? "").startsWith("ssw-test:")) {
  throw new Error("[test-harness] 拒绝运行：REDIS_PREFIX 必须以 ssw-test: 开头");
}

export const BASE_URL = process.env.TEST_BASE_URL ?? process.env.BASE_URL ?? "http://localhost:3000";

export class Jar {
  cookie = "";
  capture(res: Response): void {
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(";")[0].trim();
  }
  clear(): void {
    this.cookie = "";
  }
}

export interface ApiOptions {
  method?: string;
  body?: unknown;
  jar?: Jar;
  csrf?: string;
  headers?: Record<string, string>;
  /** 传 null 表示不带 Origin（测 403）；默认带同源 Origin。 */
  origin?: string | null;
}

export interface ApiResult {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 测试断言需动态访问 code/data/field_errors
  json: any;
  res: Response;
}

export async function api(path: string, options: ApiOptions = {}): Promise<ApiResult> {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  if (options.origin === undefined) headers.Origin = BASE_URL;
  else if (options.origin !== null) headers.Origin = options.origin;
  if (options.jar?.cookie) headers.Cookie = options.jar.cookie;
  if (options.csrf) headers["X-CSRF-Token"] = options.csrf;
  let payload: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(options.body);
  }
  const res = await fetch(`${BASE_URL}${path}`, { method: options.method ?? "GET", headers, body: payload });
  const text = await res.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 测试 harness 解析的动态 JSON
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text };
  }
  return { status: res.status, json, res };
}

export async function getCsrf(jar: Jar): Promise<string> {
  const { status, json } = await api("/api/auth/csrf", { jar });
  assert.equal(status, 200, `GET /api/auth/csrf 期望 200，实际 ${status}：${JSON.stringify(json)}`);
  assert.equal(json.code, 0);
  return json.data.csrf_token as string;
}

let phoneSeq = 0;
export function uniquePhone(): string {
  phoneSeq += 1;
  const tail = `${Date.now().toString().slice(-6)}${String(phoneSeq).padStart(2, "0")}`;
  return `139${tail}`;
}

const trackedPhones: string[] = [];
export function trackPhone(phone: string): string {
  trackedPhones.push(phone);
  return phone;
}

export async function cleanupTestUsers(): Promise<void> {
  if (trackedPhones.length === 0) return;
  const { prisma } = await import("../../src/server/db/prisma");
  const users = await prisma.user.findMany({ where: { phone: { in: trackedPhones } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  if (ids.length > 0) {
    // Scope cleanup to users created by this suite, never flush shared Redis/outbox.
    for(const id of ids)await prisma.eventOutbox.deleteMany({where:{payloadJson:{path:"$.userId",equals:id.toString()}}});
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.operationLog.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.idempotencyRecord.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.dm.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
  trackedPhones.length = 0;
}

export async function ensureSeeded(): Promise<void> {
  const { seedMemberLevels } = await import("../../prisma/seed");
  await seedMemberLevels();
}
