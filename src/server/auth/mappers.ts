import type { MemberLevel, User } from "@prisma/client";
import type { MeDto, MemberLevelDto, StaffDto } from "@/lib/api/contracts";

export type UserWithLevel = User & { memberLevel: MemberLevel | null };
export type StaffRow = User & { dmProfile: { id: bigint } | null };

export const bigId = (id: bigint): string => id.toString();
export const money = (value: { toFixed(digits: number): string }): string => value.toFixed(2);

export function toMemberLevelDto(level: MemberLevel): MemberLevelDto {
  return {
    id: bigId(level.id),
    code: level.code,
    name: level.name,
    rank: level.rank,
    topup_threshold: money(level.topupThreshold),
    discount_rate: level.discountRate.toFixed(4),
  };
}

export function toMeDto(user: UserWithLevel): MeDto {
  return {
    id: bigId(user.id),
    phone: user.phone,
    nickname: user.nickname,
    role: user.role,
    status: user.status,
    balance: money(user.balance),
    points: user.points,
    total_topup: money(user.totalTopup),
    member_level: user.memberLevel ? toMemberLevelDto(user.memberLevel) : null,
    created_at: user.createdAt.toISOString(),
  };
}

/** 员工行只取白名单字段，绝不返回 passwordHash。 */
export function toStaffDto(user: StaffRow): StaffDto {
  return {
    id: bigId(user.id),
    phone: user.phone,
    nickname: user.nickname,
    role: user.role,
    status: user.status,
    member_level_id: user.memberLevelId === null ? null : bigId(user.memberLevelId),
    dm_profile_id: user.dmProfile ? bigId(user.dmProfile.id) : null,
    created_at: user.createdAt.toISOString(),
  };
}
