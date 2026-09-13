import { assertPermission } from "../auth/permissions";
import { conflict, notFound } from "../http/errors";
import {
  date,
  id,
  integer,
  text,
  contact,
  invalid,
  whitelist,
} from "../sessions/validation";
import { event, audit, type Context } from "../sessions/shared";
import { requestDto, requestInclude } from "../sessions/dto";
import { createSession } from "../sessions/service";
import { joinSession } from "../bookings/service";
export async function submitRequest(c: Context, b: Record<string, unknown>) {
  whitelist(b, ["script_id", "expected_time", "player_count", "remark"]);
  const sid = id(b.script_id, "script_id"),
    time = date(b.expected_time, "expected_time"),
    n = integer(b.player_count, "player_count");
  const script = await c.tx.script.findUnique({ where: { id: sid } });
  if (!script || script.status !== "on")
    return invalid("script_id", "请选择上架剧本");
  if (n > script.maxPlayers) return invalid("player_count", "超过剧本人数上限");
  const user = await c.tx.user.findUniqueOrThrow({
    where: { id: BigInt(c.actor.userId) },
  });
  const person = contact({ name: user.nickname, phone: user.phone });
  const r = await c.tx.bookingRequest.create({
    data: {
      userId: user.id,
      scriptId: sid,
      expectedTime: time,
      playerCount: n,
      ...person,
      remark: text(b.remark, "remark"),
    },
    include: requestInclude,
  });
  await event(c, "booking_request.created", "booking_request", r.id);
  return requestDto(r);
}
export async function reviewRequest(
  c: Context,
  requestId: string,
  decision: "approved" | "rejected",
  b: Record<string, unknown>,
) {
  assertPermission(c.actor, "sessions.manage");
  whitelist(
    b,
    decision === "approved"
      ? [
          "primary_dm_id",
          "backup_dm_ids",
          "start_time",
          "player_min",
          "player_max",
          "price",
        ]
      : ["reason"],
  );
  const rid = id(requestId);
  const rows = await c.tx.$queryRaw<
    { id: bigint }[]
  >`SELECT id FROM BookingRequest WHERE id=${rid} FOR UPDATE`;
  if (!rows.length) throw notFound();
  const old = await c.tx.bookingRequest.findUniqueOrThrow({
    where: { id: rid },
    include: requestInclude,
  });
  if (old.status !== "pending")
    throw conflict(3001, "申请已经审核，不能重复或改变结论");
  let sessionId: bigint | undefined, bookingId: string | undefined;
  if (decision === "approved") {
    const when = date(b.start_time, "start_time");
    if (when.getTime() !== old.expectedTime.getTime())
      return invalid("start_time", "须与申请期望时间一致，不可静默替换");
    const user = await c.tx.user.findUniqueOrThrow({
      where: { id: old.userId },
    });
    if (user.status !== "active") return invalid("contact", "申请人账号已停用");
    const person = contact({ name: old.contactName, phone: old.contactPhone });
    const s = await createSession(
      c,
      {
        ...b,
        script_id: old.scriptId.toString(),
        status: "open",
        remark: old.remark ?? "",
      },
      old.userId,
    );
    sessionId = BigInt(s.id);
    const booking = await joinSession(
      c,
      s.id,
      {
        player_count: old.playerCount,
        contact: { name: person.contactName, phone: person.contactPhone },
      },
      old.userId,
    );
    bookingId = booking.id;
  }
  const updated = await c.tx.bookingRequest.update({
    where: { id: rid },
    data: {
      status: decision,
      reviewerId: BigInt(c.actor.userId),
      reviewedAt: new Date(),
      sessionId,
      reason:
        decision === "rejected" ? text(b.reason, "reason", 500, true) : null,
    },
    include: requestInclude,
  });
  await audit(
    c,
    `booking_request.${decision}`,
    "booking_request",
    rid,
    requestDto(old),
    requestDto(updated),
  );
  await event(
    c,
    `booking_request.${decision}`,
    "booking_request",
    rid,
    { sessionId: sessionId?.toString(), player_count: old.playerCount },
    [old.userId.toString()],
  );
  return { ...requestDto(updated), booking_id: bookingId ?? null };
}
