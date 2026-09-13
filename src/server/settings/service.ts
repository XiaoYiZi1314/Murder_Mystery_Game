import { Prisma } from '@prisma/client';
import { prisma, type DbTx } from '../db/prisma';
import { assertPermission } from '../auth/permissions';
import type { Actor } from '../auth/session';
import { conflict, unprocessable } from '../http/errors';
import { recordOperation } from '../audit/log';
import { enqueueOutbox } from '../events/outbox';
import { syncMediaReferences, validateMedia } from '../media/service';
export const SETTINGS_KEYS=['wechat_qrcode','notify_push_enabled'] as const;
export async function publicSettings(){
 const [qr,featured]=await Promise.all([prisma.setting.findUnique({where:{key:'wechat_qrcode'}}),prisma.script.findMany({where:{status:'on',featured:true},orderBy:{id:'asc'},select:{id:true}})]);
 return {wechat_qrcode:typeof qr?.value==='string'?qr.value:null,featured_script_ids:featured.map(s=>s.id.toString())};
}
export async function adminSettings(actor:Actor){
 assertPermission(actor,'settings.write');
 const rows=await prisma.setting.findMany({where:{key:{in:[...SETTINGS_KEYS]}}});
 const get=(key:string)=>rows.find(r=>r.key===key);
 return {wechat_qrcode:typeof get('wechat_qrcode')?.value==='string'?get('wechat_qrcode')!.value:null,notify_push_enabled:get('notify_push_enabled')?.value===true,versions:Object.fromEntries(SETTINGS_KEYS.map(k=>[k,get(k)?.updatedAt.toISOString()??null]))};
}
export async function saveSettings(actor:Actor,body:Record<string,unknown>,tx:DbTx,ip:string){
 assertPermission(actor,'settings.write');
 for(const key of Object.keys(body))if(key!=='versions'&&!SETTINGS_KEYS.includes(key as typeof SETTINGS_KEYS[number]))throw unprocessable('未知设置项',{[key]:['不允许修改此键']});
 const versions=body.versions as Record<string,unknown>|undefined;
 if(!versions||typeof versions!=='object'||Array.isArray(versions))throw unprocessable('缺少设置版本');
 for(const key of SETTINGS_KEYS){
  if(!(key in body))continue;
  // D11: each accepted key independently requires manager/boss, never generic employee PATCH.
  assertPermission(actor,'settings.write');
  const value=body[key];
  if(key==='notify_push_enabled'&&typeof value!=='boolean')throw unprocessable('通知开关须为布尔值',{[key]:['无效值']});
  if(key==='wechat_qrcode'){
   if(value!==null&&typeof value!=='string')throw unprocessable('二维码资源无效');
   await validateMedia(tx,actor,[value as string|null],['cover'],undefined,['wechat_qrcode']);
  }
  const old=await tx.setting.findUnique({where:{key}});
  if(versions[key]!== (old?.updatedAt.toISOString()??null))throw conflict(undefined,'设置已更新，请重新加载');
  if(old){
   const result=await tx.setting.updateMany({where:{key,updatedAt:old.updatedAt},data:{value:value===null?Prisma.JsonNull:value as Prisma.InputJsonValue,updatedAt:new Date(Math.max(Date.now(),old.updatedAt.getTime()+1))}});
   if(result.count!==1)throw conflict(undefined,'设置已更新，请重新加载');
  }else{
   try{await tx.setting.create({data:{key,value:value===null?Prisma.JsonNull:value as Prisma.InputJsonValue}});}catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==='P2002')throw conflict();throw e;}
  }
  if(key==='wechat_qrcode')await syncMediaReferences(tx,'settings',key,[value as string|null]);
  await recordOperation(tx,{actorId:actor.userId,actorRole:actor.role,action:'settings.update',targetType:'settings',targetId:key,summaryBefore:{value:old?.value??null},summaryAfter:{value},ip});
 }
 await enqueueOutbox(tx,{type:'catalog.changed',payload:{entity:'settings',op:'update'}});
 return {saved:true};
}
