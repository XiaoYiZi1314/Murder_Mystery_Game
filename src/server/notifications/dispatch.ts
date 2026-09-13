import { prisma, type DbTx } from "../db/prisma";

const MAX_ATTEMPTS = 10;

function backoffMs(attempts: number): number {
  // 指数退避：5s 起，单次上限约 7 分钟。
  return Math.min(5_000 * 2 ** Math.max(0, attempts - 1), 420_000);
}

interface StaffEventPayload {
  actorId?: string;
  userId?: string;
  nickname?: string;
  role?: string;
  status?: string;
  password_changed?: boolean;
}

async function notifyStaffEvent(tx: DbTx, eventId: string, type: string, payload: StaffEventPayload): Promise<void> {
  if (!payload.userId) return;
  const userId = BigInt(payload.userId);
  let title = "";
  let body = "";
  if (type === "staff.created") {
    title = "账号已开通";
    body = `店长已为你开通${payload.role === "dm" ? "DM" : "店员"}账号，请及时修改初始密码。`;
  } else if (type === "staff.updated") {
    if (payload.password_changed) {
      title = "密码已被重置";
      body = "店长已重置你的登录密码，请用新密码重新登录。";
    } else if (payload.status === "disabled") {
      title = "账号已禁用";
      body = "你的员工账号已被禁用，如有疑问请联系店长。";
    } else if (payload.status === "active") {
      title = "账号已恢复";
      body = "你的员工账号已恢复正常。";
    } else {
      title = "资料已更新";
      body = `店长更新了你的员工资料（${payload.nickname ?? ""}）。`;
    }
  } else {
    return;
  }
  // eventId + userId 唯一约束保证投递幂等：重复投递不会产生第二条通知。
  await tx.notification.upsert({
    where: { eventId_userId: { eventId, userId } },
    update: {},
    create: { userId, type, title, body, eventId },
  });
}

export interface OutboxBatchResult {
  processed: number;
  delivered: number;
  dead: number;
}

/**
 * 拉取到期 pending 事件逐条投递；单条失败不影响同批其他事件。
 * 未知类型直接标记 delivered 并告警（防毒丸事件卡死队列）。
 */
export async function processOutboxBatch(limit = 20): Promise<OutboxBatchResult> {
  const now = new Date();
  const rows = await prisma.eventOutbox.findMany({
    where: { status: "pending", OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }] },
    orderBy: { id: "asc" },
    take: limit,
  });
  let delivered = 0;
  let dead = 0;
  for (const row of rows) {
    try {
      const payload = (row.payloadJson ?? {}) as StaffEventPayload;
      await prisma.$transaction(async (tx) => {
        if (row.type === "staff.created" || row.type === "staff.updated") {
          await notifyStaffEvent(tx, `outbox:${row.id}`, row.type, payload);
        } else {
           
          console.warn(`[outbox] 未知事件类型 ${row.id}(${row.type})，跳过投递`);
        }
        await tx.eventOutbox.update({
          where: { id: row.id },
          data: { status: "delivered", attempts: row.attempts + 1, deliveredAt: new Date() },
        });
      });
      delivered += 1;
    } catch (error: unknown) {
      const attempts = row.attempts + 1;
      const isDead = attempts >= MAX_ATTEMPTS;
      await prisma.eventOutbox.update({
        where: { id: row.id },
        data: isDead
          ? { status: "dead", attempts }
          : { attempts, nextRetryAt: new Date(Date.now() + backoffMs(attempts)) },
      });
      if (isDead) dead += 1;
       
      console.error(`[outbox] 事件 ${row.id}(${row.type}) 投递失败（第 ${attempts} 次）：`, error);
    }
  }
  return { processed: rows.length, delivered, dead };
}
