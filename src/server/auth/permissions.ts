import type { Actor } from "./session";
import type { UserRole } from "@/types/domain";
import { forbidden, unauthenticated } from "../http/errors";

/**
 * C2 统一权限登记表：所有管理端写 API 必须经 assertPermission（共享契约“共享权限矩阵（冻结）”）。
 * 角色列表与设计文档 §2.2 逐行对齐；D11（设置逐键冻结 2026-09-13）的差异在对应注释中显式记录。
 */
export type Permission =
  | "sessions.manage"
  | "content.read"
  | "content.write"
  | "dm.profile.write"
  | "settings.write"
  | "staff.manage"
  | "finance.read"
  | "finance.write"
  | "reports.read"
  | "sensitive_words.manage"
  | "levels.manage"
  | "audit.read";

export const PERMISSION_MATRIX: Record<Permission, readonly UserRole[]> = {
  "sessions.manage": ["dm", "manager", "boss"],
  // 后台内容列表可见性：manager+boss（DM 无内容维护职责，§2.2 无对应行）。
  "content.read": ["manager", "boss"],
  // 剧本/妆造/标签 增删改与上下架：§2.2「剧本、妆造：上架/下架/新增编辑 = 店长+BOSS」。
  "content.write": ["manager", "boss"],
  // 编辑 DM 展示信息/照片：§2.2「DM 仅自己 + 店长 + BOSS」；resource 级自校验见 assertPermission。
  "dm.profile.write": ["dm", "manager", "boss"],
  // 店铺设置（wechat_qrcode、notify_push_enabled）：manager+boss。
  // 2026-09-13 需求方明确确认：店长与 BOSS 可维护二维码和通知开关。
  // D11 禁止对 staff 泛化放开 ⇒ DM 明确排除（D11 设置冻结 2026-09-13）。
  "settings.write": ["manager", "boss"],
  // C1 已实现并测试为 BOSS 专属（staff.test.ts「manager 与 dm 均不得访问员工管理」）。
  // D11「manager 可创建/维护 DM」的更大范围未在 C1 落地，C2 维持现状不改动 C1 行为，待单独确认。
  "staff.manage": ["boss"],
  // 记账/押金/财务：§2.2 仅 BOSS。
  "finance.read": ["boss"],
  "finance.write": ["boss"],
  // 举报处理：§2.2 仅 BOSS。
  "reports.read": ["boss"],
  // 敏感词库：§2.2 仅 BOSS。
  "sensitive_words.manage": ["boss"],
  // 等级规则：§2.2 仅 BOSS。
  "levels.manage": ["boss"],
  // 操作日志查看：§2.2 仅 BOSS。
  "audit.read": ["boss"],
};

export interface DmProfileResource {
  type: "dm_profile";
  /** 被编辑 DM 档案对应的 user id（字符串）。 */
  dmUserId: string;
}

/**
 * 权限断言：未登录 401；角色不在矩阵 403（不区分提示，防探测）。
 * dm.profile.write 附带资源级校验：DM 角色仅能编辑本人档案。
 */
export function assertPermission(
  actor: Actor | null,
  permission: Permission,
  resource?: DmProfileResource,
): Actor {
  if (!actor) throw unauthenticated();
  if (!PERMISSION_MATRIX[permission].includes(actor.role)) throw forbidden();
  if (permission === "dm.profile.write" && resource) {
    if (actor.role === "dm" && resource.dmUserId !== actor.userId)
      throw forbidden();
  }
  return actor;
}
