import { Prisma } from "@prisma/client";
import { recordOperation } from "../audit/log";
import { enqueueOutbox } from "../events/outbox";
import type { DbTx } from "../db/prisma";
import type { Actor } from "../auth/session";
import { notFound } from "../http/errors";
export type Context = { tx: DbTx; actor: Actor; ip: string };
export async function lockSession(tx: DbTx, id: bigint) {
  const rows = await tx.$queryRaw<
    { id: bigint }[]
  >`SELECT id FROM Session WHERE id=${id} FOR UPDATE`;
  if (!rows.length) throw notFound();
}
export async function bumpSession(tx: DbTx, id: bigint) {
  await tx.$executeRaw`UPDATE Session SET updatedAt=GREATEST(NOW(3),TIMESTAMPADD(MICROSECOND,1000,updatedAt)) WHERE id=${id}`;
}
export async function audit(
  c: Context,
  action: string,
  targetType: string,
  targetId: bigint,
  before: unknown,
  after: unknown,
) {
  await recordOperation(c.tx, {
    actorId: c.actor.userId,
    actorRole: c.actor.role,
    action,
    targetType,
    targetId: targetId.toString(),
    summaryBefore:
      before === null ? undefined : (before as Prisma.InputJsonValue),
    summaryAfter: after as Prisma.InputJsonValue,
    ip: c.ip,
  });
}
export async function event(
  c: Context,
  type: string,
  subjectType: string,
  subjectId: bigint,
  payload: Record<string, unknown> = {},
  recipients?: string[],
) {
  const users =
    recipients ??
    (
      await c.tx.user.findMany({
        where: { role: { in: ["dm", "manager", "boss"] }, status: "active" },
        select: { id: true },
      })
    ).map((u) => u.id.toString());
  await enqueueOutbox(c.tx, {
    type,
    payload: {
      actorUserId: c.actor.userId,
      subjectType,
      subjectId: subjectId.toString(),
      recipientUserIds: [...new Set(users)],
      occurredAt: new Date().toISOString(),
      ...payload,
    },
  });
}
