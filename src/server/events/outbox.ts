import type { Prisma } from "@prisma/client";
import { prisma, type DbTx } from "../db/prisma";

type Writer = DbTx | typeof prisma;

/** Outbox 入队：必须与业务写同一事务提交，保证“业务成功 ⇔ 事件不丢”。 */
export async function enqueueOutbox(
  writer: Writer,
  event: { type: string; payload: Record<string, unknown> },
): Promise<void> {
  await writer.eventOutbox.create({
    data: { type: event.type, payloadJson: event.payload as Prisma.InputJsonValue },
  });
}
