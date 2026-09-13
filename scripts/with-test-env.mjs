/**
 * 以 .env.test 启动任意命令（测试库/测试 Redis 命名空间）。
 * 用法：node scripts/with-test-env.mjs npm run dev
 *      node scripts/with-test-env.mjs npm run test:integration
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envTest = path.join(root, ".env.test");
if (!fs.existsSync(envTest)) {
  console.error("[with-test-env] 缺少 .env.test，请复制 .env.example 创建并填入本机测试库口令后重试");
  process.exit(1);
}
const env = { ...process.env };
for (const line of fs.readFileSync(envTest, "utf8").split(/\r?\n/)) {
  const text = line.trim();
  if (!text || text.startsWith("#")) continue;
  const eq = text.indexOf("=");
  if (eq <= 0) continue;
  const key = text.slice(0, eq).trim();
  let value = text.slice(eq + 1).trim();
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  if (key && !(key in env)) env[key] = value;
}
for (const [from, to] of [
  ["TEST_DATABASE_URL", "DATABASE_URL"],
  ["TEST_REDIS_URL", "REDIS_URL"],
  ["TEST_REDIS_PREFIX", "REDIS_PREFIX"],
]) {
  if (env[from]) env[to] = env[from];
}
if (!String(env.DATABASE_URL ?? "").includes("shisanwu_test")) {
  console.error("[with-test-env] 拒绝运行：DATABASE_URL 未指向 shisanwu_test");
  process.exit(1);
}
const [, , ...cmd] = process.argv;
if (cmd.length === 0) {
  console.error("[with-test-env] 用法：node scripts/with-test-env.mjs <命令...>");
  process.exit(1);
}
const child = spawn(cmd.join(" "), { stdio: "inherit", shell: true, env });
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
