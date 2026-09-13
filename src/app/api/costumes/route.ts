import type { NextRequest } from "next/server";
import { withCommand } from "@/server/http/with-command";
import { parseListQuery } from "@/server/catalog/validation";
import { listCostumes } from "@/server/catalog/queries";
import { paginated } from "@/server/catalog/dto";

export const dynamic = "force-dynamic";

/** GET /api/costumes：妆造公开列表（匿名可用；仅 status=on）。 */
export async function GET(req: NextRequest) {
  return withCommand(req, { auth: "optional" }, async () => {
    const q = parseListQuery(req.nextUrl.searchParams);
    const { items, total } = await listCostumes(q, false);
    return { data: paginated(items, q.page, q.pageSize, total) };
  });
}
