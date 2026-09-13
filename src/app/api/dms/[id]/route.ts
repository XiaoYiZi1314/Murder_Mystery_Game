import type { NextRequest } from "next/server";
import { withCommand } from "@/server/http/with-command";
import { getDmDetail } from "@/server/catalog/queries";

export const dynamic = "force-dynamic";

/** GET /api/dms/:id：DM 详情（公开；顾客仅见 active 及其带过的上架剧本）。 */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withCommand(req, { auth: "optional" }, async ({ actor }) => {
    return { data: await getDmDetail(id, actor, false) };
  });
}
