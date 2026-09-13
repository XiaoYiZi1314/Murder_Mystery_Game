import { assertPermission } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";
import { notFound } from "@/server/http/errors";
import { getDmDetail } from "@/server/catalog/queries";
import type { NextRequest } from "next/server";
import { withCommand } from "@/server/http/with-command";
import { unauthenticated } from "@/server/http/errors";
import { updateDmProfile } from "@/server/catalog/commands";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/dms/:id：编辑 DM 展示信息。
 * 权限在命令内做资源级校验：DM 仅本人（dm.profile.write + resource），manager/boss 任意；
 * status 仅 manager/boss 可写（DM 提交 status ⇒ 422）。
 */
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withCommand(req, { auth: "required", idempotent: `admin.dm.update:${id}` }, async ({ actor, body, ip, tx }) => {
    if (!actor) throw unauthenticated();
    if (!tx) throw new Error("[catalog] 幂等事务缺失");
    const dto = await updateDmProfile(id, body, { actor, ip, tx });
    return { message: "更新成功", data: dto };
  });
}

export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 return withCommand(req,{auth:"required"},async({actor})=>{
 const dm=await prisma.dm.findUnique({where:{id:BigInt(id)}});if(!dm)throw notFound();
 const a=assertPermission(actor,"dm.profile.write",{type:"dm_profile",dmUserId:dm.userId.toString()});
 return {data:{...await getDmDetail(id,a,true),status:dm.status}};
 });
}
