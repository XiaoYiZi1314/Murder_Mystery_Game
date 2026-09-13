import type { NextRequest } from "next/server";
import { withCommand } from "@/server/http/with-command";
import { assertPermission } from "@/server/auth/permissions";
import { parseListQuery } from "@/server/catalog/validation";
import { listScriptsAdmin } from "@/server/catalog/queries";
import { paginated } from "@/server/catalog/dto";
import { createScript } from "@/server/catalog/commands";

export const dynamic = "force-dynamic";

/** GET /api/admin/scripts：后台剧本列表（manager/boss，全状态）。 */
export async function GET(req: NextRequest) {
  return withCommand(req, { auth: "required" }, async ({ actor }) => {
    assertPermission(actor, "content.read");
    const q = parseListQuery(req.nextUrl.searchParams);
    const { items, total } = await listScriptsAdmin(q);
    return { data: paginated(items, q.page, q.pageSize, total) };
  });
}

/** POST /api/admin/scripts：新建剧本（content.write；同事务审计 + catalog.changed）。 */
export async function POST(req: NextRequest) {
  return withCommand(req, { auth: "required", idempotent: "admin.script.create" }, async ({ actor, body, ip, tx }) => {
    const w = assertPermission(actor, "content.write");
    if (!tx) throw new Error("[catalog] 幂等事务缺失");
    const dto = await createScript(body, { actor: w, ip, tx });
    return { status: 201, message: "创建成功", data: dto };
  });
}
