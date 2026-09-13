import { ApiCodes } from "@/lib/api/contracts";
import type { StaffDto } from "@/lib/api/contracts";
import type { Actor } from "../auth/session";
import { toStaffDto, type StaffRow } from "../auth/mappers";
import { hashPassword } from "../auth/password";
import { revokeUserSessions } from "../auth/session";
import { recordOperation } from "../audit/log";
import { enqueueOutbox } from "../events/outbox";
import { prisma, type DbTx } from "../db/prisma";
import { conflict, notFound, unprocessable } from "../http/errors";
import { assertNickname, assertPassword, assertPhone } from "../http/validate";

const STAFF_INCLUDE = { dmProfile: { select: { id: true } } } as const;

export type StaffRole = "dm" | "manager";

export interface StaffContext {
  actor: Actor;
  ip: string;
  tx: DbTx;
}

function assertStaffRole(role: unknown): asserts role is StaffRole {
  if (role !== "dm" && role !== "manager") {
    throw unprocessable("员工角色只能为 dm 或 manager", { role: ["只能为 dm 或 manager"] });
  }
}

function assertStaffStatus(status: unknown): asserts status is "active" | "disabled" {
  if (status !== "active" && status !== "disabled") {
    throw unprocessable("员工状态只能为 active 或 disabled", { status: ["只能为 active 或 disabled"] });
  }
}

export async function listStaff(role?: string): Promise<StaffDto[]> {
  let roles: ("dm" | "manager" | "boss")[] = ["dm", "manager"];
  if (role !== undefined) {
    if (role !== "dm" && role !== "manager" && role !== "boss") {
      throw unprocessable("role 筛选非法", { role: ["只能为 dm / manager / boss"] });
    }
    roles = [role];
  }
  const rows = await prisma.user.findMany({
    where: { role: { in: roles } },
    include: STAFF_INCLUDE,
    orderBy: { id: "asc" },
  });
  return rows.map((row) => toStaffDto(row as StaffRow));
}

export async function createStaff(input: Record<string, unknown>, ctx: StaffContext): Promise<StaffDto> {
  const { phone, password, nickname, role } = input;
  assertPhone(phone);
  assertPassword(password);
  assertNickname(nickname);
  assertStaffRole(role);
  const normalizedPhone = phone.trim();
  const exists = await ctx.tx.user.findUnique({ where: { phone: normalizedPhone } });
  if (exists) throw conflict(ApiCodes.PHONE_TAKEN, "该手机号已注册");
  const passwordHash = await hashPassword(password);
  const user = await ctx.tx.user.create({
    data: { phone: normalizedPhone, nickname: nickname.trim(), passwordHash, role },
    include: STAFF_INCLUDE,
  });
  let dmProfile: { id: bigint } | null = user.dmProfile;
  if (role === "dm") {
    const dm = await ctx.tx.dm.create({ data: { userId: user.id } });
    dmProfile = { id: dm.id };
  }
  await recordOperation(ctx.tx, {
    actorId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    action: "staff.create",
    targetType: "user",
    targetId: String(user.id),
    summaryAfter: { phone: user.phone, nickname: user.nickname, role: user.role },
    ip: ctx.ip,
  });
  await enqueueOutbox(ctx.tx, {
    type: "staff.created",
    payload: { actorId: ctx.actor.userId, userId: String(user.id), nickname: user.nickname, role: user.role },
  });
  return toStaffDto({ ...user, dmProfile });
}

export async function updateStaff(
  id: string,
  patch: Record<string, unknown>,
  ctx: StaffContext,
): Promise<StaffDto> {
  if (!/^\d+$/.test(id)) throw notFound("员工不存在");
  const userId = BigInt(id);
  const existing = await ctx.tx.user.findUnique({ where: { id: userId }, include: STAFF_INCLUDE });
  if (!existing || (existing.role !== "dm" && existing.role !== "manager")) {
    throw notFound("员工不存在");
  }
  const { nickname, role, status, new_password } = patch;
  if (nickname !== undefined) assertNickname(nickname);
  if (role !== undefined) assertStaffRole(role);
  if (status !== undefined) assertStaffStatus(status);
  if (new_password !== undefined) assertPassword(new_password);

  const data: { nickname?: string; role?: StaffRole; status?: "active" | "disabled"; passwordHash?: string } = {};
  if (nickname !== undefined) data.nickname = (nickname as string).trim();
  if (role !== undefined) data.role = role;
  if (status !== undefined) data.status = status;
  if (new_password !== undefined) data.passwordHash = await hashPassword(new_password as string);

  const updated = await ctx.tx.user.update({ where: { id: userId }, data, include: STAFF_INCLUDE });
  let dmProfile: { id: bigint } | null = updated.dmProfile;
  if (updated.role === "dm" && !dmProfile) {
    // manager 转 DM 时补建档案；DM 转岗保留档案（不断历史关联）。
    const dm = await ctx.tx.dm.create({ data: { userId } });
    dmProfile = { id: dm.id };
  }
  if ((status === "disabled" && existing.status !== "disabled") || new_password !== undefined) {
    // 禁用或改密后立即吊销该员工全部会话。
    await revokeUserSessions(String(userId));
  }
  await recordOperation(ctx.tx, {
    actorId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    action: "staff.update",
    targetType: "user",
    targetId: String(userId),
    summaryBefore: { nickname: existing.nickname, role: existing.role, status: existing.status },
    summaryAfter: {
      nickname: updated.nickname,
      role: updated.role,
      status: updated.status,
      password_changed: new_password !== undefined,
    },
    ip: ctx.ip,
  });
  await enqueueOutbox(ctx.tx, {
    type: "staff.updated",
    payload: {
      actorId: ctx.actor.userId,
      userId: String(userId),
      nickname: updated.nickname,
      role: updated.role,
      status: updated.status,
      password_changed: new_password !== undefined,
    },
  });
  return toStaffDto({ ...updated, dmProfile });
}
