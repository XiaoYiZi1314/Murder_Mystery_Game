import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { ApiCodes } from "@/lib/api/contracts";
import { prisma, type DbTx } from "../db/prisma";
import { conflict } from "./errors";

export interface IdempotentResult {
  status: number;
  message: string;
  data: unknown;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function toJsonable(value: unknown): unknown {
  // 幂等快照必须可序列化：业务侧应只返回 wire DTO，此处做防御性 BigInt 转换。
  return JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === "bigint" ? item.toString() : item,
    ),
  ) as unknown;
}

/**
 * actor + operation + key 幂等执行：占位行与业务/audit/outbox 同一事务。
 * 同 key 同请求 → 返回首次结果；同 key 异请求 → 409；并发 pending → 409。
 */
export async function runIdempotent(args: {
  actorId: bigint;
  operation: string;
  key: string;
  requestHash: string;
  work: (tx: DbTx) => Promise<IdempotentResult>;
}): Promise<IdempotentResult & { replayed: boolean }> {
  const { actorId, operation, key, requestHash, work } = args;
  const unique = { actorId_operation_key: { actorId, operation, key } };
  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.idempotencyRecord.findUnique({ where: unique });
      if (existing) {
        if (existing.requestHash !== requestHash) {
          throw conflict(
            ApiCodes.IDEMPOTENT_CONFLICT,
            "相同幂等键但请求内容不一致",
          );
        }
        if (existing.status === "completed") {
          return {
            ...((existing.responseJson as IdempotentResult | null) ?? {
              status: 200,
              message: "OK",
              data: null,
            }),
            replayed: true,
          };
        }
        throw conflict(ApiCodes.CONFLICT, "相同请求正在处理中，请稍后重试");
      }
      let recordId: bigint;
      try {
        const created = await tx.idempotencyRecord.create({
          data: { actorId, operation, key, requestHash, status: "pending" },
        });
        recordId = created.id;
      } catch (error: unknown) {
        if (!isUniqueViolation(error)) throw error;
        const raced = await tx.idempotencyRecord.findUnique({ where: unique });
        if (
          raced &&
          raced.requestHash === requestHash &&
          raced.status === "completed"
        ) {
          return {
            ...((raced.responseJson as IdempotentResult | null) ?? {
              status: 200,
              message: "OK",
              data: null,
            }),
            replayed: true,
          };
        }
        if (raced && raced.requestHash !== requestHash) {
          throw conflict(
            ApiCodes.IDEMPOTENT_CONFLICT,
            "相同幂等键但请求内容不一致",
          );
        }
        throw conflict(ApiCodes.CONFLICT, "相同请求正在处理中，请稍后重试");
      }
      const result = await work(tx);
      await tx.idempotencyRecord.update({
        where: { id: recordId },
        data: {
          status: "completed",
          responseJson: toJsonable(result) as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });
      return { ...result, replayed: false };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 10000,
      timeout: 15000,
    },
  );
}

export function hashRequest(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value) ?? "null")
    .digest("hex");
}
