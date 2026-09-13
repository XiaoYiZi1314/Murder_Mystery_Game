import type { NextRequest } from "next/server";
import { withCommand } from "@/server/http/with-command";
import { assertPermission } from "@/server/auth/permissions";
import { listTags } from "@/server/catalog/queries";
import { createTag } from "@/server/catalog/commands";

export const dynamic = "force-dynamic";

/** GET /api/admin/tags：标签列表（含引用计数）。 */
export async function GET(req: NextRequest) {
  return withCommand(req, { auth: "required" }, async ({ actor }) => {
    assertPermission(actor, actor?.role === "dm" ? "dm.profile.write" : "content.read");
    return { data: await listTags() };
  });
}

/** POST /api/admin/tags：新建标签（重名 409）。 */
export async function POST(req: NextRequest) {
  return withCommand(req, { auth: "required", idempotent: "admin.tag.create" }, async ({ actor, body, ip, tx }) => {
    const w = assertPermission(actor, "content.write");
    if (!tx) throw new Error("[catalog] 幂等事务缺失");
    const dto = await createTag(body, { actor: w, ip, tx });
    return { status: 201, message: "创建成功", data: dto };
  });
}
