import { prisma, type DbTx } from "../db/prisma";

import { redis } from "../db/redis";
import { bounded } from "../sessions/cache";
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

async function notifyStaffEvent(
  tx: DbTx,
  eventId: string,
  type: string,
  payload: StaffEventPayload,
): Promise<void> {
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

const bookingTitles: Record<string, string> = {
  "booking_request.created": "新的自主预约申请",
  "booking_request.approved": "预约已通过并已占坑",
  "booking_request.rejected": "预约申请未通过",
  "booking.joined": "有新的团队报名",
  "booking.cancelled": "有报名取消",
  "session.capacity_reached": "场次人数已达最低人数（并非锁车）",
  "session.cancelled": "场次已取消",
};
interface BookingEventPayload {
  recipientUserIds?: string[];
  subjectId?: string;
  sessionId?: string;
  player_count?: number;
  booked_count?: number;
  player_min?: number;
  player_max?: number;
}
async function notifyBookingEvent(
  tx: DbTx,
  eventId: string,
  type: string,
  payload: BookingEventPayload,
) {
  const recipientIds = payload.recipientUserIds ?? [];
  const recipients = await tx.user.findMany({
    where: {
      id: { in: recipientIds.map(BigInt) },
      status: "active",
      ...([
        "booking_request.created",
        "booking.joined",
        "booking.cancelled",
        "session.capacity_reached",
      ].includes(type)
        ? {
            role: {
              in: ["dm", "manager", "boss"] as ("dm" | "manager" | "boss")[],
            },
          }
        : {}),
    },
    select: { id: true },
  });
  for (const user of recipients) {
    const customer = [
      "booking_request.approved",
      "booking_request.rejected",
      "session.cancelled",
    ].includes(type);
    const href = customer
      ? "/me/booking"
      : type === "booking_request.created"
        ? "/admin/sessions/pending"
        : "/admin/bookings";
    const body =
      type === "booking_request.approved"
        ? `审核通过，已为你的团队占据 ${payload.player_count} 个位置，请在我的预约查看。`
        : type === "session.capacity_reached"
          ? `已报 ${payload.booked_count} / 最低 ${payload.player_min} / 上限 ${payload.player_max}；仍需商家手动处理锁车。`
          : "请打开对应页面查看最新状态。";
    await tx.notification.upsert({
      where: { eventId_userId: { eventId, userId: user.id } },
      update: {},
      create: {
        eventId,
        userId: user.id,
        type,
        title: bookingTitles[type],
        body,
        href,
      },
    });
  }
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
export async function processOutboxBatch(
  limit = 20,
  eventIds?: bigint[],
): Promise<OutboxBatchResult> {
  const now = new Date();
  const rows = await prisma.eventOutbox.findMany({
    where: {
      ...(eventIds ? { id: { in: eventIds } } : {}),
      status: "pending",
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    },
    orderBy: { id: "asc" },
    take: limit,
  });
  let delivered = 0;
  let dead = 0;
  for (const row of rows) {
    try {
      const payload = (row.payloadJson ?? {}) as StaffEventPayload;
      // Redis is a retryable side effect, never part of the original business transaction.
      if (bookingTitles[row.type] || row.type === "session.changed") {
        await bounded(redis().incr("c3:sessions:epoch"));
        for (const uid of (row.payloadJson as BookingEventPayload)
          .recipientUserIds ?? [])
          await bounded(
            redis().set(
              "c3:notification-signal:" + uid,
              String(row.id),
              "EX",
              86400,
            ),
          );
      }
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM event_outbox WHERE id=${row.id} FOR UPDATE`;
        const current = await tx.eventOutbox.findUniqueOrThrow({
          where: { id: row.id },
        });
        if (current.status !== "pending") return;
        if (row.type === "staff.created" || row.type === "staff.updated") {
          await notifyStaffEvent(tx, `outbox:${row.id}`, row.type, payload);
        } else if (bookingTitles[row.type]) {
          await notifyBookingEvent(
            tx,
            `outbox:${row.id}`,
            row.type,
            row.payloadJson as BookingEventPayload,
          );
        } else if (row.type === "session.changed") {
          // Redis invalidation above; no customer notification for a normal edit.
        } else if (row.type === "catalog.changed") {
          // C2 public reads are request-time/no-store. No shared content cache to invalidate; no customer notification.
        } else {
          console.warn(
            `[outbox] 未知事件类型 ${row.id}(${row.type})，跳过投递`,
          );
        }
        await tx.eventOutbox.update({
          where: { id: row.id },
          data: {
            status: "delivered",
            attempts: row.attempts + 1,
            deliveredAt: new Date(),
          },
        });
      });
      delivered += 1;
    } catch (error: unknown) {
      const attempts = row.attempts + 1;
      const isDead = attempts >= MAX_ATTEMPTS;
      await prisma.eventOutbox.updateMany({
        where: { id: row.id, status: "pending" },
        data: isDead
          ? { status: "dead", attempts }
          : {
              attempts,
              nextRetryAt: new Date(Date.now() + backoffMs(attempts)),
            },
      });
      if (isDead) dead += 1;

      console.error(
        `[outbox] 事件 ${row.id}(${row.type}) 投递失败（第 ${attempts} 次）：`,
        error,
      );
    }
  }
  return { processed: rows.length, delivered, dead };
}
