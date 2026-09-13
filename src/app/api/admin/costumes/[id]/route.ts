import { getCostumeDetail } from "@/server/catalog/queries";
import type { NextRequest } from "next/server";
import { withCommand } from "@/server/http/with-command";
import { assertPermission } from "@/server/auth/permissions";
import { updateCostume, deleteCostume } from "@/server/catalog/commands";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/costumes/:id：更新妆造。 */
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withCommand(req, { auth: "required", idempotent: `admin.costume.update:${id}` }, async ({ actor, body, ip, tx }) => {
    const w = assertPermission(actor, "content.write");
    if (!tx) throw new Error("[catalog] 幂等事务缺失");
    const dto = await updateCostume(id, body, { actor: w, ip, tx });
    return { message: "更新成功", data: dto };
  });
}

/** DELETE /api/admin/costumes/:id：删除（被剧本引用 409）。 */
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withCommand(req, { auth: "required", idempotent: `admin.costume.delete:${id}`, parseBody: false }, async ({ actor, body, ip, tx }) => {
    const w = assertPermission(actor, "content.write");
    if (!tx) throw new Error("[catalog] 幂等事务缺失");
    void body;
    return { data: await deleteCostume(id, { actor: w, ip, tx }) };
  });
}

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;return withCommand(req,{auth:"required"},async({actor})=>{const a=assertPermission(actor,"content.read");return {data:await getCostumeDetail(id,a,true)};});
}
