import { prisma, type DbTx } from "../db/prisma";
import type { Actor } from "../auth/session";
import { forbidden } from "../http/errors";
import { pagination } from "../sessions/queries";
import { id, invalid } from "../sessions/validation";
export async function listNotifications(actor: Actor, q: URLSearchParams) {
  const { page, size, skip } = pagination(q),
    userId = BigInt(actor.userId);
  const [rows, total, unread] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: size,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return {
    items: rows.map((n) => ({
      id: n.id.toString(),
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      read_at: n.readAt?.toISOString() ?? null,
      created_at: n.createdAt.toISOString(),
    })),
    unread_count: unread,
    page_info: {
      page,
      page_size: size,
      total,
      total_pages: Math.ceil(total / size),
    },
  };
}
export async function readNotifications(
  actor: Actor,
  value: unknown,
  tx: DbTx,
) {
  if (!Array.isArray(value) || value.length > 100)
    return invalid("ids", "通知 ID 数组最多 100 个");
  const ids = [...new Set(value.map((v) => id(v)))],
    userId = BigInt(actor.userId);
  const rows = await tx.notification.findMany({ where: { id: { in: ids } } });
  if (rows.length !== ids.length || rows.some((n) => n.userId !== userId))
    throw forbidden();
  await tx.notification.updateMany({
    where: { id: { in: ids }, userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { read: true };
}
