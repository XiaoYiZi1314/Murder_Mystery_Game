import type { Actor } from "../auth/session";
import { forbidden, unauthenticated } from "../http/errors";

/** BOSS 专属：员工管理仅店长可操作，其余角色一律 403（不区分提示，防探测）。 */
export function requireBoss(actor: Actor | null): Actor {
  if (!actor) throw unauthenticated();
  if (actor.role !== "boss") throw forbidden("仅店长可执行该操作");
  return actor;
}
