import type { NextRequest } from "next/server";
import { requireBoss } from "@/server/staff/guards";
import { createStaff, listStaff } from "@/server/staff/service";
import { withCommand } from "@/server/http/with-command";

export const dynamic = "force-dynamic";

/** GET /api/admin/staff?role=：BOSS 专属员工列表，默认 dm + manager。 */
export async function GET(req: NextRequest) {
  return withCommand(req, { auth: "required", csrf: false }, async ({ actor }) => {
    requireBoss(actor);
    const role = req.nextUrl.searchParams.get("role") ?? undefined;
    return { data: await listStaff(role) };
  });
}

/** POST /api/admin/staff：BOSS 建员工（dm/manager），幂等键必填。 */
export async function POST(req: NextRequest) {
  return withCommand(req, { auth: "required", idempotent: "admin.staff.create" }, async ({ actor, body, ip, tx }) => {
    const boss = requireBoss(actor);
    if (!tx) throw new Error("[staff] 幂等事务缺失");
    const dto = await createStaff(body, { actor: boss, ip, tx });
    return { status: 201, message: "员工已创建", data: dto };
  });
}
