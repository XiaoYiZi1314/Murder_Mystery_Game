import type { NextRequest } from "next/server";
import { withCommand } from "@/server/http/with-command";
import { assertPermission } from "@/server/auth/permissions";
import { renameTag, deleteTag } from "@/server/catalog/commands";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/tags/:id：重命名（重名 409）。 */
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withCommand(req, { auth: "required", idempotent: `admin.tag.rename:${id}` }, async ({ actor, body, ip, tx }) => {
    const w = assertPermission(actor, "content.write");
    if (!tx) throw new Error("[catalog] 幂等事务缺失");
    const dto = await renameTag(id, body, { actor: w, ip, tx });
    return { message: "更新成功", data: dto };
  });
}

/** DELETE /api/admin/tags/:id：删除（被引用 409）。 */
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withCommand(req, { auth: "required", idempotent: `admin.tag.delete:${id}`, parseBody: false }, async ({ actor, body, ip, tx }) => {
    const w = assertPermission(actor, "content.write");
    if (!tx) throw new Error("[catalog] 幂等事务缺失");
    void body;
    return { data: await deleteTag(id, { actor: w, ip, tx }) };
  });
}
