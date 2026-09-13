import type { NextRequest } from "next/server";
import { withCommand } from "@/server/http/with-command";
import { parseListQuery } from "@/server/catalog/validation";
import { listDms } from "@/server/catalog/queries";
import { paginated } from "@/server/catalog/dto";

export const dynamic = "force-dynamic";

/** GET /api/dms：DM 公开列表（匿名可用；仅 active；投影不含 phone/role）。 */
export async function GET(req: NextRequest) {
  return withCommand(req, { auth: "optional" }, async () => {
    const q = parseListQuery(req.nextUrl.searchParams);
    const { items, total } = await listDms(q, false);
    return { data: paginated(items, q.page, q.pageSize, total) };
  });
}
