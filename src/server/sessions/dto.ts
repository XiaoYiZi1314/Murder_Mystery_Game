import { Prisma } from "@prisma/client";
export const sessionInclude = {
  script: { select: { id: true, slug: true, title: true, coverUrl: true } },
  dm: { include: { user: { select: { nickname: true } } } },
  backupDms: {
    include: { dm: { include: { user: { select: { nickname: true } } } } },
  },
} satisfies Prisma.SessionInclude;
type SessionRow = Prisma.SessionGetPayload<{ include: typeof sessionInclude }>;
export function sessionDto(s: SessionRow) {
  return {
    id: s.id.toString(),
    script_id: s.scriptId.toString(),
    script: {
      id: s.script.id.toString(),
      slug: s.script.slug,
      title: s.script.title,
      cover: s.script.coverUrl,
    },
    primary_dm_id: s.dmId?.toString() ?? null,
    primary_dm_name: s.dm?.user.nickname ?? null,
    backup_dm_ids: s.backupDms.map((b) => b.dmId.toString()),
    start_time: s.startsAt.toISOString(),
    player_min: s.minPlayers,
    player_max: s.capacity,
    booked_count: s.bookedCount,
    remaining_count: Math.max(0, s.capacity - s.bookedCount),
    needed_count: Math.max(0, s.minPlayers - s.bookedCount),
    price: s.pricePerPlayer.toFixed(2),
    status: s.status,
    source: s.source,
    remark: s.remark,
    updated_at: s.updatedAt.toISOString(),
  };
}
export const bookingInclude = {
  session: { include: sessionInclude },
} satisfies Prisma.BookingInclude;
export function bookingDto(
  b: Prisma.BookingGetPayload<{ include: typeof bookingInclude }>,
) {
  return {
    id: b.id.toString(),
    session_id: b.sessionId.toString(),
    player_count: b.playerCount,
    contact: { name: b.contactName, phone: b.contactPhone },
    status: b.status,
    total_amount: b.totalAmount.toFixed(2),
    cancelled_at: b.cancelledAt?.toISOString() ?? null,
    remaining_count: Math.max(0, b.session.capacity - b.session.bookedCount),
    session: sessionDto(b.session),
  };
}
export const requestInclude = {
  script: { select: { title: true, slug: true } },
} satisfies Prisma.BookingRequestInclude;
export function requestDto(
  r: Prisma.BookingRequestGetPayload<{ include: typeof requestInclude }>,
) {
  return {
    id: r.id.toString(),
    script_id: r.scriptId.toString(),
    script_title: r.script.title,
    expected_time: r.expectedTime.toISOString(),
    player_count: r.playerCount,
    remark: r.remark,
    status: r.status,
    reason: r.reason,
    session_id: r.sessionId?.toString() ?? null,
    reviewed_at: r.reviewedAt?.toISOString() ?? null,
    created_at: r.createdAt.toISOString(),
  };
}
export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  size: number,
) {
  return {
    items,
    page_info: {
      page,
      page_size: size,
      total,
      total_pages: Math.ceil(total / size),
    },
  };
}
