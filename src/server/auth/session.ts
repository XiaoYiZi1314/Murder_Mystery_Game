import { randomBytes } from "node:crypto";
import type { UserRole } from "@/types/domain";
import { getSessionConfig } from "../config";
import { prisma } from "../db/prisma";
import { redis } from "../db/redis";
import { unauthenticated } from "../http/errors";

export interface Actor {
  userId: string;
  role: UserRole;
}

export interface SessionData {
  userId: string;
  role: UserRole;
  csrfToken: string;
  createdAt: string;
}

const sessionKey = (token: string): string => `sess:${token}`;
const userSessionsKey = (userId: string): string => `user_sessions:${userId}`;

function newToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function getCookieToken(req: Request, cookieName?: string): string | null {
  const name = cookieName ?? getSessionConfig().cookieName;
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim() || null;
  }
  return null;
}

export function buildSessionCookie(token: string | null): string {
  const { cookieName, ttlSeconds, secureCookies } = getSessionConfig();
  if (!token) return `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  const parts = [`${cookieName}=${token}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${ttlSeconds}`];
  if (secureCookies) parts.push("Secure");
  return parts.join("; ");
}

export async function createSession(userId: string, role: UserRole): Promise<{ token: string; csrfToken: string }> {
  const { ttlSeconds } = getSessionConfig();
  const token = newToken();
  const csrfToken = newToken(24);
  const payload: SessionData = { userId, role, csrfToken, createdAt: new Date().toISOString() };
  const client = redis();
  await client.set(sessionKey(token), JSON.stringify(payload), "EX", ttlSeconds);
  await client.sadd(userSessionsKey(userId), token);
  await client.expire(userSessionsKey(userId), ttlSeconds);
  return { token, csrfToken };
}

export async function getSession(token: string): Promise<SessionData | null> {
  try {
    const raw = await redis().get(sessionKey(token));
    if (!raw) return null;
    const data = JSON.parse(raw) as SessionData;
    if (!data?.userId || !data?.role || !data?.csrfToken) return null;
    return data;
  } catch {
    return null;
  }
}

export async function revokeSession(token: string): Promise<void> {
  const data = await getSession(token);
  const client = redis();
  await client.del(sessionKey(token));
  if (data) await client.srem(userSessionsKey(data.userId), token);
}

/** 吊销该用户全部会话（禁用/改角色/改密后调用）。 */
export async function revokeUserSessions(userId: string): Promise<void> {
  const client = redis();
  const tokens = await client.smembers(userSessionsKey(userId));
  if (tokens.length > 0) await client.del(...tokens.map(sessionKey));
  await client.del(userSessionsKey(userId));
}

/** 会话→Actor：同时用 DB 复核账号状态与角色（防旧权限继续生效）。 */
export async function getSessionFromRequest(
  req: Request,
): Promise<{ actor: Actor; session: SessionData; token: string } | null> {
  const token = getCookieToken(req);
  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: BigInt(session.userId) },
    select: { id: true, role: true, status: true },
  });
  if (!user || user.status !== "active" || user.role !== session.role) return null;
  return { actor: { userId: session.userId, role: session.role }, session, token };
}

export async function requireActor(req: Request): Promise<{ actor: Actor; session: SessionData; token: string }> {
  const found = await getSessionFromRequest(req);
  if (!found) throw unauthenticated();
  return found;
}

export async function ensureCsrfToken(token: string, session: SessionData): Promise<string> {
  if (session.csrfToken) return session.csrfToken;
  // 兼容无令牌旧会话：补发并回写（简单起见重置 TTL）。
  const csrfToken = newToken(24);
  const { ttlSeconds } = getSessionConfig();
  await redis().set(sessionKey(token), JSON.stringify({ ...session, csrfToken }), "EX", ttlSeconds);
  return csrfToken;
}
