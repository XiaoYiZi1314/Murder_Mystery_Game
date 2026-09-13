import type { NextRequest } from "next/server";
import { requireBoss } from "@/server/staff/guards";
import { updateStaff } from "@/server/staff/service";
import { withCommand } from "@/server/http/with-command";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/staff/:id：BOSS 改员工；幂等域按目标 id 隔离。 */
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withCommand(req, { auth: "required", idempotent: `admin.staff.update:${id}` }, async ({ actor, body, ip, tx }) => {
    const boss = requireBoss(actor);
    if (!tx) throw new Error("[staff] 幂等事务缺失");
    const dto = await updateStaff(id, body, { actor: boss, ip, tx });
    return { message: "员工已更新", data: dto };
  });
}
