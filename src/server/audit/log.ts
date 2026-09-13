import type { Prisma } from "@prisma/client";
import type { UserRole } from "@/types/domain";
import { prisma, type DbTx } from "../db/prisma";

type Writer = DbTx | typeof prisma;

export interface OperationSeed {
  actorId: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  summaryBefore?: unknown;
  summaryAfter?: unknown;
  ip?: string;
}

function toJsonInput(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
}

/** 操作审计：与业务写同一事务提交；before/after 只记白名单字段，绝不记密码哈希。 */
export async function recordOperation(writer: Writer, seed: OperationSeed): Promise<void> {
  await writer.operationLog.create({
    data: {
      actorId: BigInt(seed.actorId),
      actorRole: seed.actorRole,
      action: seed.action,
      targetType: seed.targetType,
      targetId: seed.targetId,
      summaryBefore: toJsonInput(seed.summaryBefore),
      summaryAfter: toJsonInput(seed.summaryAfter),
      ip: seed.ip ?? null,
    },
  });
}
