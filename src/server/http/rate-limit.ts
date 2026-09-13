import { getLoginRateLimitConfig } from "../config";
import { redis } from "../db/redis";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
}

async function readCount(key: string): Promise<number> {
  const raw = await redis().get(key);
  return raw === null ? 0 : Number.parseInt(raw, 10) || 0;
}

/** 读当前计数（不递增），供登录先判后验（fail-closed）。 */
export async function getRateLimitCount(key: string): Promise<number> {
  return readCount(key);
}

/** 失败一次计数；首击设窗口过期。返回递增后是否仍在限额内。 */
export async function hitRateLimit(key: string, max?: number, windowSeconds?: number): Promise<RateLimitResult> {
  const config = getLoginRateLimitConfig();
  const limit = max ?? config.max;
  const window = windowSeconds ?? config.windowSeconds;
  const client = redis();
  const count = await client.incr(key);
  if (count === 1) await client.expire(key, window);
  return { allowed: count <= limit, count };
}

export async function clearRateLimit(key: string): Promise<void> {
  await redis().del(key);
}

export async function isRateLimited(key: string, max?: number): Promise<boolean> {
  const config = getLoginRateLimitConfig();
  return (await readCount(key)) >= (max ?? config.max);
}

export const loginIpKey = (ip: string): string => `rl:login:ip:${ip}`;
export const loginPhoneKey = (phone: string): string => `rl:login:phone:${phone}`;
export const registerIpKey = (ip: string): string => `rl:register:ip:${ip}`;
