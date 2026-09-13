import { loadEnvFile } from "../src/server/config";
import { redis } from "../src/server/db/redis";

loadEnvFile(".env.test");
if (process.env.TEST_REDIS_URL) process.env.REDIS_URL = process.env.TEST_REDIS_URL;
if (process.env.TEST_REDIS_PREFIX) process.env.REDIS_PREFIX = process.env.TEST_REDIS_PREFIX;

async function main() {
  const client = redis();
  const keys = await client.keys("ssw-test:rl:*");
  if (keys.length > 0) await client.del(...keys);
  console.log("flushed rl keys:", keys.length);
  await client.quit();
}

main().catch((e) => { console.error("fail:", e); process.exit(1); });
