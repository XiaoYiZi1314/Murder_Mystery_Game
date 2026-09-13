/**
 * C1 服务端配置：缺失即报明确错误；附零依赖 .env 解析供脚本/测试使用。
 * Next.js 运行时 .env 由框架加载；tsx 脚本与集成测试需显式 loadEnvFile。
 */
import fs from "node:fs";
import path from "node:path";

export function loadEnvFile(file = ".env"): void {
  const full = path.resolve(/* turbopackIgnore: true */ process.cwd(), file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    const eq = text.indexOf("=");
    if (eq <= 0) continue;
    const key = text.slice(0, eq).trim();
    let value = text.slice(eq + 1).trim();
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    else if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[config] 缺失必需环境变量 ${name}，请对照 .env.example 配置后重试`);
  return value;
}

export function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) throw new Error(`[config] 环境变量 ${name} 不是合法整数：${raw}`);
  return parsed;
}

export function boolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return raw === "1" || raw.toLowerCase() === "true";
}

export interface SessionConfig {
  cookieName: string;
  ttlSeconds: number;
  secureCookies: boolean;
}

export function getSessionConfig(): SessionConfig {
  return {
    cookieName: process.env.SESSION_COOKIE_NAME ?? "shisanwu_session",
    ttlSeconds: intEnv("SESSION_TTL_SECONDS", 604800),
    secureCookies: boolEnv("SESSION_SECURE_COOKIES", process.env.NODE_ENV === "production"),
  };
}

export interface RateLimitConfig {
  max: number;
  windowSeconds: number;
}

export function getLoginRateLimitConfig(): RateLimitConfig {
  return {
    max: intEnv("LOGIN_RATE_LIMIT_MAX", 5),
    windowSeconds: intEnv("LOGIN_RATE_LIMIT_WINDOW_SECONDS", 600),
  };
}

export interface Argon2Config {
  memoryKib: number;
  timeCost: number;
  parallelism: number;
}

export function getArgon2Config(): Argon2Config {
  return {
    memoryKib: intEnv("ARGON2_MEMORY_KIB", 19456),
    timeCost: intEnv("ARGON2_TIME_COST", 2),
    parallelism: intEnv("ARGON2_PARALLELISM", 1),
  };
}

export interface RedisConfig {
  url: string;
  prefix: string;
}

export function getRedisConfig(): RedisConfig {
  return { url: required("REDIS_URL"), prefix: process.env.REDIS_PREFIX ?? "ssw:" };
}
