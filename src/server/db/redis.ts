import Redis from "ioredis";
import { getRedisConfig } from "../config";

declare global {
   
  var __sswRedis: Redis | undefined;
}

/** 惰性单例：首次调用时建连；缺 REDIS_URL 即报明确错误。 */
export function redis(): Redis {
  if (!globalThis.__sswRedis) {
    const { url, prefix } = getRedisConfig();
    globalThis.__sswRedis = new Redis(url, {
      keyPrefix: prefix,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    });
  }
  return globalThis.__sswRedis;
}

export async function closeRedis(): Promise<void> {
  if (globalThis.__sswRedis) {
    const client = globalThis.__sswRedis;
    globalThis.__sswRedis = undefined;
    if (client.status === "ready" || client.status === "connect") await client.quit();
    else client.disconnect();
  }
}
