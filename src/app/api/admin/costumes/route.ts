import type { NextRequest } from "next/server";
import { withCommand } from "@/server/http/with-command";
import { assertPermission } from "@/server/auth/permissions";
import { parseListQuery } from "@/server/catalog/validation";
import { listCostumes } from "@/server/catalog/queries";
import { paginated } from "@/server/catalog/dto";
import { createCostume } from "@/server/catalog/commands";

export const dynamic = "force-dynamic";

/** GET /api/admin/costumes：后台妆造列表（manager/boss，全状态）。 */
export async function GET(req: NextRequest) {
  return withCommand(req, { auth: "required" }, async ({ actor }) => {
    assertPermission(actor, "content.read");
    const q = parseListQuery(req.nextUrl.searchParams);
    const { items, total } = await listCostumes(q, true);
    return { data: paginated(items, q.page, q.pageSize, total) };
  });
}

/** POST /api/admin/costumes：新建妆造（content.write）。 */
export async function POST(req: NextRequest) {
  return withCommand(req, { auth: "required", idempotent: "admin.costume.create" }, async ({ actor, body, ip, tx }) => {
    const w = assertPermission(actor, "content.write");
    if (!tx) throw new Error("[catalog] 幂等事务缺失");
    const dto = await createCostume(body, { actor: w, ip, tx });
    return { status: 201, message: "创建成功", data: dto };
  });
}
