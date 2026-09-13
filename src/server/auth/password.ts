import { hash, verify } from "@node-rs/argon2";
import { getArgon2Config } from "../config";

/** argon2id 哈希（@node-rs/argon2 默认即 argon2id；参数走环境变量）。 */
export async function hashPassword(password: string): Promise<string> {
  const config = getArgon2Config();
  return hash(password, {
    memoryCost: config.memoryKib,
    timeCost: config.timeCost,
    parallelism: config.parallelism,
  });
}

export async function verifyPassword(hashValue: string, password: string): Promise<boolean> {
  try {
    return await verify(hashValue, password);
  } catch {
    // 哈希损坏/格式非法一律按校验失败处理，不抛 500。
    return false;
  }
}
