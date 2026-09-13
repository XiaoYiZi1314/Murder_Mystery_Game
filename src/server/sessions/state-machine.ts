import type { GameSessionStatus } from "@prisma/client";
import { conflict } from "../http/errors";
export function capacityStatus(booked: number, max: number): "open" | "full" {
  return booked >= max ? "full" : "open";
}
export function assertCapacity(booked: number, n: number, max: number) {
  if (!Number.isInteger(n) || n < 1 || booked + n > max)
    throw conflict(3001, "剩余坑位不足，请刷新人数后重新确认");
}
export function assertEditable(
  status: GameSessionStatus,
  booked: number,
  body: Record<string, unknown>,
) {
  if (!["draft", "open", "full"].includes(status))
    throw conflict(3001, "该场次不允许 C3 编辑或取消");
  if (
    booked > 0 &&
    Object.keys(body).some(
      (k) => !["remark", "player_max", "updated_at"].includes(k),
    )
  )
    throw conflict(3001, "已有报名，仅可修改备注与人数上限");
}
