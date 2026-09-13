import { getScriptDetail } from "@/server/catalog/queries";
import type { NextRequest } from "next/server";
import { withCommand } from "@/server/http/with-command";
import { assertPermission } from "@/server/auth/permissions";
import { updateScript, deleteScript } from "@/server/catalog/commands";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/scripts/:id：更新（可整体替换角色/关联；updated_at 条件更新 ⇒ 陈旧 409）。 */
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withCommand(req, { auth: "required", idempotent: `admin.script.update:${id}` }, async ({ actor, body, ip, tx }) => {
    const w = assertPermission(actor, "content.write");
    if (!tx) throw new Error("[catalog] 幂等事务缺失");
    const dto = await updateScript(id, body, { actor: w, ip, tx });
    return { message: "更新成功", data: dto };
  });
}

/** DELETE /api/admin/scripts/:id：删除（存在场次 409；否则级联清子表）。 */
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withCommand(req, { auth: "required", idempotent: `admin.script.delete:${id}`, parseBody: false }, async ({ actor, body, ip, tx }) => {
    const w = assertPermission(actor, "content.write");
    if (!tx) throw new Error("[catalog] 幂等事务缺失");
    void body;
    return { data: await deleteScript(id, { actor: w, ip, tx }) };
  });
}

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 return withCommand(req,{auth:"required"},async({actor})=>{
 const a=assertPermission(actor,"content.read");return {data:await getScriptDetail(id,a)};
 });
}
