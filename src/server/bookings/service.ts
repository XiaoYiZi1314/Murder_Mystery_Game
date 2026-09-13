import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { conflict, forbidden, notFound } from "../http/errors";
import {
  id,
  integer,
  contact,
  whitelist,
  invalid,
} from "../sessions/validation";
import {
  lockSession,
  bumpSession,
  event,
  type Context,
} from "../sessions/shared";
import { bookingDto, bookingInclude } from "../sessions/dto";
import { assertCapacity, capacityStatus } from "../sessions/state-machine";
export async function joinSession(
  c: Context,
  sessionId: string,
  body: Record<string, unknown>,
  userId = BigInt(c.actor.userId),
) {
  whitelist(body, ["player_count", "contact"]);
  const count = integer(body.player_count, "player_count"),
    person = contact(body.contact),
    sid = id(sessionId);
  await lockSession(c.tx, sid);
  const s = await c.tx.session.findUniqueOrThrow({ where: { id: sid } });
  if (s.status !== "open" || s.startsAt.getTime() <= Date.now())
    throw conflict(3001, "场次已满、未开放或已开始");
  assertCapacity(s.bookedCount, count, s.capacity);
  const total = new Prisma.Decimal(s.pricePerPlayer).mul(count);
  if (total.greaterThan("99999999.99"))
    return invalid("player_count", "团队总额超过系统金额上限");
  const b = await c.tx.booking.create({
    data: {
      bookingNo: randomUUID(),
      userId,
      sessionId: sid,
      playerCount: count,
      totalAmount: total,
      status: "joined",
      ...person,
    },
  });
  const next = s.bookedCount + count;
  await c.tx.session.update({
    where: { id: sid },
    data: { bookedCount: next, status: capacityStatus(next, s.capacity) },
  });
  await bumpSession(c.tx, sid);
  await event(c, "booking.joined", "booking", b.id, { sessionId: sessionId });
  if (s.bookedCount < s.minPlayers && next >= s.minPlayers)
    await event(c, "session.capacity_reached", "session", sid, {
      booked_count: next,
      player_min: s.minPlayers,
      player_max: s.capacity,
    });
  return bookingDto(
    await c.tx.booking.findUniqueOrThrow({
      where: { id: b.id },
      include: bookingInclude,
    }),
  );
}
export async function cancelBooking(c: Context, bookingId: string) {
  const bid = id(bookingId);
  const hint = await c.tx.booking.findUnique({
    where: { id: bid },
    select: { sessionId: true, userId: true },
  });
  if (!hint) throw notFound();
  if (hint.userId !== BigInt(c.actor.userId)) throw forbidden();
  // All capacity paths lock the session first, then its booking: a single global lock order.
  await lockSession(c.tx, hint.sessionId);
  await c.tx.$queryRaw`SELECT id FROM Booking WHERE id=${bid} FOR UPDATE`;
  const b = await c.tx.booking.findUniqueOrThrow({
    where: { id: bid },
    include: bookingInclude,
  });
  if (b.status === "cancelled") return bookingDto(b);
  if (
    b.status !== "joined" ||
    b.depositRecorded ||
    !["open", "full"].includes(b.session.status)
  )
    throw conflict(3001, "该报名不能走未锁车取消，请联系门店");
  const count = b.session.bookedCount - b.playerCount;
  if (count < 0) throw conflict(3001, "容量账不一致，需核对");
  await c.tx.booking.update({
    where: { id: bid },
    data: { status: "cancelled", cancelledAt: new Date() },
  });
  await c.tx.session.update({
    where: { id: hint.sessionId },
    data: {
      bookedCount: count,
      status: capacityStatus(count, b.session.capacity),
    },
  });
  await bumpSession(c.tx, hint.sessionId);
  await event(c, "booking.cancelled", "booking", bid, {
    sessionId: hint.sessionId.toString(),
  });
  return bookingDto(
    await c.tx.booking.findUniqueOrThrow({
      where: { id: bid },
      include: bookingInclude,
    }),
  );
}
