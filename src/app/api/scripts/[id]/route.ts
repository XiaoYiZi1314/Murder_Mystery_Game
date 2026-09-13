import type { NextRequest } from "next/server";
import { withCommand } from "@/server/http/with-command";
import { getScriptDetail } from "@/server/catalog/queries";

export const dynamic = "force-dynamic";

/** GET /api/scripts/:id：详情需登录（匿名 401）；顾客只见 on（草稿/下架 404 不泄露存在）；员工可见任意状态。 */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withCommand(req, { auth: "required" }, async ({ actor }) => {
    return { data: await getScriptDetail(id, actor) };
  });
}
