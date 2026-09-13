import type { NextRequest } from "next/server";
import { withCommand } from "@/server/http/with-command";
import { parseListQuery } from "@/server/catalog/validation";
import { listScripts } from "@/server/catalog/queries";
import { paginated } from "@/server/catalog/dto";

export const dynamic = "force-dynamic";

/** GET /api/scripts：公开剧本列表（匿名可用；仅 status=on，稳定排序 + 分页）。 */
export async function GET(req: NextRequest) {
  return withCommand(req, { auth: "optional" }, async ({ actor }) => {
    const q = parseListQuery(req.nextUrl.searchParams);
    const { items, total } = await listScripts(q, actor);
    return { data: paginated(items, q.page, q.pageSize, total) };
  });
}
