import type { NextRequest } from "next/server";
import { withCommand } from "@/server/http/with-command";
import { getCostumeDetail } from "@/server/catalog/queries";

export const dynamic = "force-dynamic";

/** GET /api/costumes/:id：妆造详情（公开；顾客仅见 on 及其关联的上架剧本）。 */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withCommand(req, { auth: "optional" }, async ({ actor }) => {
    return { data: await getCostumeDetail(id, actor, false) };
  });
}
