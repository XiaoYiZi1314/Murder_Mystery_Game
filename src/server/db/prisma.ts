import { Prisma, PrismaClient } from "@prisma/client";
import { required } from "../config";

/** 交互式事务客户端类型（业务服务与审计/事件共用同一 tx）。 */
export type DbTx = Prisma.TransactionClient;

declare global {
   
  var __sswPrisma: PrismaClient | undefined;
}

function create(): PrismaClient {
  required("DATABASE_URL");
  return new PrismaClient();
}

export function getPrisma(): PrismaClient {
  if (!globalThis.__sswPrisma) globalThis.__sswPrisma = create();
  return globalThis.__sswPrisma;
}

/**
 * 惰性代理：import 时不建连（构建期安全），首次访问属性时才建客户端。
 * 缺 DATABASE_URL 时抛明确错误而非 Prisma 默认长堆栈。
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma() as unknown as Record<PropertyKey, unknown>;
    const value = client[prop];
    return typeof value === "function" ? (value as (...args: never[]) => unknown).bind(client) : value;
  },
});

export async function closePrisma(): Promise<void> {
  if (globalThis.__sswPrisma) {
    await globalThis.__sswPrisma.$disconnect();
    globalThis.__sswPrisma = undefined;
  }
}
