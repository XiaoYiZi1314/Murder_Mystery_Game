import { randomBytes } from 'node:crypto';
import type { MediaPurpose } from '@prisma/client';
import { prisma, type DbTx } from '../db/prisma';
import type { Actor } from '../auth/session';
import { recordOperation } from '../audit/log';
import { forbidden, unprocessable } from '../http/errors';
import { authorizeUpload } from './authorization';
import { processImage } from './process-image';
import { storage } from './storage';
const purposes:Record<string,MediaPurpose>={script_cover:'cover',script_character:'role',dm_photo:'dm',costume:'costume',wechat_qrcode:'cover',report_evidence:'report'};
export async function uploadImage(actor:Actor, input:Buffer, mime:string, purpose:string, ip:string) {
 const visibility=authorizeUpload(actor,purpose), processed=await processImage(input,mime,purpose);
 const key=randomBytes(16).toString('hex')+'.webp', thumb=key.replace('.webp','-thumb.webp'), driver=storage();
 const written:string[]=[];
 try {
  await driver.put({key,bytes:processed.bytes,contentType:'image/webp',visibility});written.push(key);
  await driver.put({key:thumb,bytes:processed.thumbnail,contentType:'image/webp',visibility});written.push(thumb);
  return await prisma.$transaction(async tx=>{
   const a=await tx.mediaAsset.create({data:{key,ownerId:BigInt(actor.userId),purpose:purposes[purpose],visibility,format:'webp',bytes:processed.bytes.length,width:processed.width,height:processed.height,url:visibility==='public'?`/uploads/${key}`:'',thumbUrl:visibility==='public'?`/uploads/${thumb}`:null}});
   if(actor.role!=='customer')await recordOperation(tx,{actorId:actor.userId,actorRole:actor.role,action:'media.upload',targetType:'media',targetId:a.id.toString(),summaryAfter:{id:a.id.toString(),purpose},ip});
   return {id:a.id.toString(),url:visibility==='public'?a.url:`/api/media/${a.id}`,thumbnail_url:a.thumbUrl,visibility,width:a.width,height:a.height,bytes:a.bytes,format:a.format};
  });
 }catch(error){await Promise.allSettled(written.map(k=>driver.delete(k,visibility)));throw error;}
}
/** Only registered public resources; no arbitrary relative/external URLs are accepted for new writes. */
export async function validateMedia(tx:DbTx,actor:Actor,values:(string|null|undefined)[],purposes:MediaPurpose[],ownerId?:bigint,fields:string[] = []) {
 const urls=[...new Set(values.filter((v):v is string=>!!v))];
 for(const url of urls){
  const asset=await tx.mediaAsset.findFirst({where:{url,visibility:'public',purpose:{in:purposes}}});
  if(!asset)throw unprocessable('图片须先通过统一上传接口登记',{[fields[values.indexOf(url)]??'cover']:['包含未授权或未登记图片']});
  if(actor.role==='dm'&&(asset.ownerId!==BigInt(actor.userId)||ownerId!==BigInt(actor.userId)))throw forbidden();
 }
}
export async function syncMediaReferences(tx:DbTx,entityType:string,entityId:string,urls:(string|null|undefined)[]) {
 const assets=await tx.mediaAsset.findMany({where:{url:{in:urls.filter((s):s is string=>!!s)},visibility:'public'}});
 // Write-lock the asset before establishing references: orphan cleanup cannot race reference creation.
 for(const a of assets)await tx.mediaAsset.update({where:{id:a.id},data:{bytes:a.bytes}});
 await tx.mediaReference.deleteMany({where:{entityType,entityId}});
 if(assets.length)await tx.mediaReference.createMany({data:assets.map(a=>({assetId:a.id,entityType,entityId})),skipDuplicates:true});
}
/** Explicit maintenance only; grace >=7 days, bounded batch, never removes referenced assets. */
export async function cleanupOrphans(graceDays=7, assetIds?:bigint[]) {
 if(graceDays<7)throw new Error('Minimum orphan grace is 7 days');
 const before=new Date(Date.now()-graceDays*86400000),driver=storage();
 const candidates=await prisma.mediaAsset.findMany({where:{...(assetIds?{id:{in:assetIds}}:{}),createdAt:{lt:before},references:{none:{}}},take:100});
 let removed=0;
 for(const a of candidates){
  const result=await prisma.mediaAsset.deleteMany({where:{id:a.id,createdAt:{lt:before},references:{none:{}}}});
  if(result.count){await driver.delete(a.key,a.visibility);await driver.delete(a.key.replace('.webp','-thumb.webp'),a.visibility);removed++;}
 }
 return removed;
}
