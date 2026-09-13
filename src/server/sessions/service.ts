import { Prisma } from "@prisma/client";
import { assertPermission } from "../auth/permissions";
import { conflict, notFound } from "../http/errors";
import { sessionDto, sessionInclude } from "./dto";
import { capacityStatus, assertEditable } from "./state-machine";
import {
  id,
  integer,
  date,
  money,
  text,
  ids,
  invalid,
  whitelist,
} from "./validation";
import { audit, event, lockSession, bumpSession, type Context } from "./shared";
const keys = [
  "script_id",
  "primary_dm_id",
  "backup_dm_ids",
  "start_time",
  "player_min",
  "player_max",
  "price",
  "remark",
  "status",
];
async function configuration(c: Context, b: Record<string, unknown>) {
  const script = await c.tx.script.findUnique({
    where: { id: id(b.script_id, "script_id") },
  });
  if (!script || script.status !== "on")
    return invalid("script_id", "请选择上架剧本");
  const primary = id(b.primary_dm_id, "primary_dm_id"),
    backup = ids(b.backup_dm_ids, "backup_dm_ids");
  if (backup.includes(primary))
    return invalid("backup_dm_ids", "主 DM 不得同时作为备选");
  const selected = [primary, ...backup];
  const valid = await c.tx.dm.count({
    where: {
      id: { in: selected },
      status: "active",
      user: { role: "dm", status: "active" },
      scriptDms: { some: { scriptId: script.id } },
    },
  });
  if (valid !== selected.length)
    return invalid("primary_dm_id", "主备 DM 必须为该剧本有效可带员工");
  const min = integer(b.player_min ?? script.minPlayers, "player_min"),
    max = integer(b.player_max ?? script.maxPlayers, "player_max");
  if (min > max || max > script.maxPlayers || min < script.minPlayers)
    return invalid("player_max", "人数区间须在剧本允许范围内");
  const start = date(b.start_time, "start_time"),
    price =
      b.price === undefined ? script.pricePerPlayer.toFixed(2) : money(b.price);
  return {
    script,
    primary,
    backup,
    min,
    max,
    start,
    price,
    remark: text(b.remark, "remark"),
  };
}
export async function createSession(
  c: Context,
  b: Record<string, unknown>,
  initiator?: bigint,
) {
  assertPermission(c.actor, "sessions.manage");
  whitelist(b, keys);
  if (b.status !== undefined && !["draft", "open"].includes(String(b.status)))
    return invalid("status", "只能创建草稿或开放场次");
  const v = await configuration(c, b);
  const s = await c.tx.session.create({
    data: {
      scriptId: v.script.id,
      dmId: v.primary,
      startsAt: v.start,
      endsAt: new Date(v.start.getTime() + v.script.durationMinutes * 60000),
      roomName: "",
      minPlayers: v.min,
      capacity: v.max,
      pricePerPlayer: v.price,
      remark: v.remark,
      status: b.status === "draft" ? "draft" : "open",
      source: initiator ? "customer" : "merchant",
      initiatorUserId: initiator,
      backupDms: { create: v.backup.map((dmId) => ({ dmId })) },
    },
    include: sessionInclude,
  });
  const dto = sessionDto(s);
  await audit(c, "session.create", "session", s.id, null, dto);
  await event(c, "session.changed", "session", s.id, {}, []);
  return dto;
}
export async function updateSession(
  c: Context,
  sessionId: string,
  b: Record<string, unknown>,
) {
  assertPermission(c.actor, "sessions.manage");
  whitelist(b, [...keys, "updated_at"]);
  const sid = id(sessionId);
  await lockSession(c.tx, sid);
  const old = await c.tx.session.findUnique({
    where: { id: sid },
    include: sessionInclude,
  });
  if (!old) throw notFound();
  if (typeof b.updated_at !== "string")
    return invalid("updated_at", "编辑必须携带版本");
  if (b.updated_at !== old.updatedAt.toISOString())
    throw conflict(3001, "场次已更新，请重新加载");
  if (b.status === "cancelled") {
    if (Object.keys(b).some((k) => !["status", "updated_at"].includes(k)))
      return invalid("status", "取消不能同时修改场次");
    assertEditable(old.status, 0, {});
    const bookings = await c.tx.booking.findMany({
      where: { sessionId: sid, status: { not: "cancelled" } },
    });
    if (bookings.some((x) => x.status !== "joined" || x.depositRecorded))
      throw conflict(3001, "已涉及押金或履约，须使用 C4 流程");
    await c.tx.booking.updateMany({
      where: { sessionId: sid, status: "joined" },
      data: { status: "cancelled", cancelledAt: new Date() },
    });
    await c.tx.session.update({
      where: { id: sid },
      data: { status: "cancelled", bookedCount: 0 },
    });
    await bumpSession(c.tx, sid);
    await event(
      c,
      "session.cancelled",
      "session",
      sid,
      {},
      bookings.map((x) => x.userId.toString()),
    );
  } else {
    assertEditable(old.status, old.bookedCount, b);
    if (
      b.status !== undefined &&
      !(
        old.status === "draft" && ["draft", "open"].includes(String(b.status))
      ) &&
      b.status !== old.status
    )
      throw conflict(3001, "非法状态转换，满员不等于锁车");
    const data: Prisma.SessionUpdateInput = {};
    if (old.bookedCount > 0) {
      if (b.player_max !== undefined) {
        const max = integer(b.player_max, "player_max");
        if (max < old.bookedCount || max < old.minPlayers)
          throw conflict(3001, "上限不能低于已报人数或最低人数");
        const script = await c.tx.script.findUniqueOrThrow({
          where: { id: old.scriptId },
        });
        if (max > script.maxPlayers)
          return invalid("player_max", "超过剧本人数上限");
        data.capacity = max;
        data.status = capacityStatus(old.bookedCount, max);
      }
      if (b.remark !== undefined) data.remark = text(b.remark, "remark");
    } else {
      const merged = { ...sessionDto(old), ...b };
      const v = await configuration(c, merged);
      Object.assign(data, {
        script: { connect: { id: v.script.id } },
        dm: { connect: { id: v.primary } },
        startsAt: v.start,
        endsAt: new Date(v.start.getTime() + v.script.durationMinutes * 60000),
        minPlayers: v.min,
        capacity: v.max,
        pricePerPlayer: v.price,
        remark: v.remark,
        status:
          old.status === "draft"
            ? (b.status ?? "draft")
            : capacityStatus(0, v.max),
        backupDms: {
          deleteMany: {},
          create: v.backup.map((dmId) => ({ dmId })),
        },
      });
    }
    await c.tx.session.update({ where: { id: sid }, data });
    await bumpSession(c.tx, sid);
  }
  const result = sessionDto(
    await c.tx.session.findUniqueOrThrow({
      where: { id: sid },
      include: sessionInclude,
    }),
  );
  await audit(c, "session.update", "session", sid, sessionDto(old), result);
  await event(c, "session.changed", "session", sid, {}, []);
  return result;
}
