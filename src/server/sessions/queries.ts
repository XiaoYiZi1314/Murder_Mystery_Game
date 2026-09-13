import { businessRange } from "@/lib/booking-time";
import {
  Prisma,
  type GameSessionStatus,
  type BookingStatus,
  type BookingRequestStatus,
} from "@prisma/client";
import { prisma } from "../db/prisma";
import type { Actor } from "../auth/session";
import { assertPermission } from "../auth/permissions";
import {
  sessionInclude,
  sessionDto,
  bookingDto,
  bookingInclude,
  requestDto,
  requestInclude,
  paginated,
} from "./dto";
import { id, date, invalid } from "./validation";
import { cachedSessions } from "./cache";
export function pagination(q: URLSearchParams) {
  const page = Number(q.get("page") ?? 1),
    size = Number(q.get("page_size") ?? 12);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 100000 ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > 50
  )
    return invalid("page", "分页参数无效");
  return { page, size, skip: (page - 1) * size };
}
export async function listSessions(q: URLSearchParams, actor?: Actor) {
  if (actor) assertPermission(actor, "sessions.manage");
  const { page, size, skip } = pagination(q);
  const where: Prisma.SessionWhereInput = {};
  const status = q.get("status");
  if (
    status &&
    ![
      "draft",
      "open",
      "full",
      "locked",
      "running",
      "finished",
      "cancelled",
    ].includes(status)
  )
    return invalid("status", "无效场次状态");
  if (!actor) {
    if (status && !["open", "full"].includes(status))
      return invalid("status", "公开列表仅开放/满员");
    where.status = (status as "open" | "full") || { in: ["open", "full"] };
    where.startsAt = { gt: new Date() };
    where.script = { status: "on" };
  } else if (status) where.status = status as GameSessionStatus;
  if (q.get("script_id")) where.scriptId = id(q.get("script_id"), "script_id");
  const range = q.get("range");
  if (range && !["weekend", "next"].includes(range))
    return invalid("range", "无效日期范围");
  const bounds = range ? businessRange(range as "weekend" | "next") : undefined;
  const from = q.get("from") ?? bounds?.from.toISOString(),
    to = q.get("to") ?? bounds?.to.toISOString();
  if (from || to) {
    const lower = from ? date(from, "from", false) : undefined,
      upper = to ? date(to, "to", false) : undefined;
    if (lower && upper && lower >= upper)
      return invalid("to", "结束须晚于开始");
    where.startsAt = {
      ...(!actor ? { gt: new Date() } : {}),
      ...(lower ? { gte: lower } : {}),
      ...(upper ? { lt: upper } : {}),
    };
  }
  const read = async () => {
    const [rows, total] = await prisma.$transaction([
      prisma.session.findMany({
        where,
        include: sessionInclude,
        orderBy: [{ startsAt: "asc" }, { id: "asc" }],
        skip,
        take: size,
      }),
      prisma.session.count({ where }),
    ]);
    return paginated(rows.map(sessionDto), total, page, size);
  };
  return actor ? read() : cachedSessions(q.toString(), read);
}
export async function listBookings(
  actor: Actor,
  q: URLSearchParams,
  admin = false,
) {
  if (admin) assertPermission(actor, "sessions.manage");
  const { page, size, skip } = pagination(q);
  const where: Prisma.BookingWhereInput = admin
    ? {}
    : { userId: BigInt(actor.userId) };
  if (q.get("session_id"))
    where.sessionId = id(q.get("session_id"), "session_id");
  const status = q.get("status");
  if (status) {
    if (
      !["joined", "locked", "finished", "cancelled", "jumped"].includes(status)
    )
      return invalid("status", "无效报名状态");
    where.status = status as BookingStatus;
  }
  const [rows, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: size,
    }),
    prisma.booking.count({ where }),
  ]);
  return paginated(rows.map(bookingDto), total, page, size);
}
export async function listRequests(
  actor: Actor,
  q: URLSearchParams,
  admin = false,
) {
  if (admin) assertPermission(actor, "sessions.manage");
  const { page, size, skip } = pagination(q);
  const where: Prisma.BookingRequestWhereInput = admin
    ? {}
    : { userId: BigInt(actor.userId) };
  const status = q.get("status");
  if (status) {
    if (!["pending", "approved", "rejected"].includes(status))
      return invalid("status", "无效申请状态");
    where.status = status as BookingRequestStatus;
  }
  const [rows, total] = await prisma.$transaction([
    prisma.bookingRequest.findMany({
      where,
      include: requestInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: size,
    }),
    prisma.bookingRequest.count({ where }),
  ]);
  return paginated(rows.map(requestDto), total, page, size);
}
export async function sessionOptions(actor: Actor) {
  assertPermission(actor, "sessions.manage");
  const scripts = await prisma.script.findMany({
    where: { status: "on" },
    select: {
      id: true,
      title: true,
      minPlayers: true,
      maxPlayers: true,
      pricePerPlayer: true,
      scriptDms: {
        where: {
          dm: { status: "active", user: { role: "dm", status: "active" } },
        },
        select: {
          dm: { select: { id: true, user: { select: { nickname: true } } } },
        },
      },
    },
    orderBy: { id: "asc" },
  });
  return scripts.map((s) => ({
    id: s.id.toString(),
    title: s.title,
    player_min: s.minPlayers,
    player_max: s.maxPlayers,
    price: s.pricePerPlayer.toFixed(2),
    dms: s.scriptDms.map((r) => ({
      id: r.dm.id.toString(),
      name: r.dm.user.nickname,
    })),
  }));
}
