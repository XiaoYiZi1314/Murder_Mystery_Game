import { redis } from "../db/redis";
export async function bounded<T>(work: Promise<T>, ms = 500): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Redis timeout")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
export async function invalidateSessions() {
  try {
    await bounded(redis().incr("c3:sessions:epoch"));
  } catch {
    /* business commit is already durable; outbox retries and TTL bound stale data */
  }
}
export async function cachedSessions<T>(
  key: string,
  read: () => Promise<T>,
): Promise<T> {
  let cacheKey: string | undefined;
  try {
    if (redis().status === "ready") {
      const epoch = await bounded(redis().get("c3:sessions:epoch"));
      cacheKey = "c3:sessions:" + String(epoch) + ":" + key;
      const hit = await bounded(redis().get(cacheKey));
      if (hit) return JSON.parse(hit) as T;
    }
  } catch {
    cacheKey = undefined;
  }
  const value = await read();
  if (cacheKey)
    try {
      await bounded(redis().set(cacheKey, JSON.stringify(value), "EX", 5));
    } catch {}
  return value;
}
