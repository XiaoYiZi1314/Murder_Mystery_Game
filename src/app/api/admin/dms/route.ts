import type { NextRequest } from "next/server";
import { withCommand } from "@/server/http/with-command";
import { assertPermission } from "@/server/auth/permissions";
import { parseListQuery } from "@/server/catalog/validation";
import { listDms } from "@/server/catalog/queries";
import { paginated } from "@/server/catalog/dto";

export const dynamic = "force-dynamic";

/** GET /api/admin/dms：后台 DM 列表（manager/boss，全状态）。 */
export async function GET(req: NextRequest) {
  return withCommand(req, { auth: "required" }, async ({ actor }) => {
    assertPermission(actor, "content.read");
    const q = parseListQuery(req.nextUrl.searchParams);
    const { items, total } = await listDms(q, true);
    return { data: paginated(items, q.page, q.pageSize, total) };
  });
}
