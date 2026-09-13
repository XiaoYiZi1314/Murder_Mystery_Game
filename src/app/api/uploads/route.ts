import type { NextRequest } from 'next/server';
import { withCommand } from '@/server/http/with-command';
import { authorizeUpload } from '@/server/media/authorization';
import { uploadImage } from '@/server/media/service';
import { unprocessable } from '@/server/http/errors';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest){
 return withCommand(req,{auth:'required',parseBody:false},async({actor,ip})=>{
  if(!actor)throw new Error('Missing actor');
  const limit=5*1024*1024+64*1024;
  if(Number(req.headers.get('content-length')??0)>limit)throw unprocessable('上传超过 5MB');
  if(!req.headers.get('content-type')?.startsWith('multipart/form-data'))throw unprocessable('请使用 multipart/form-data');
  const reader=req.body?.getReader();if(!reader)throw unprocessable('缺少文件');
  let length=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw unprocessable('上传超过 5MB');}chunks.push(value);}
  let form:FormData;
  try{form=await new Response(Buffer.concat(chunks),{headers:{'content-type':req.headers.get('content-type')!}}).formData();}catch{throw unprocessable('上传格式错误');}
  const file=form.get('file'),purpose=String(form.get('purpose')??'');
  authorizeUpload(actor,purpose);
  if(!(file instanceof File)||form.getAll('file').length!==1)throw unprocessable('请选择一张图片');
  if(/[\\/\x00]/.test(file.name)||file.name.includes('..'))throw unprocessable('非法文件名');
  return {status:201,data:await uploadImage(actor,Buffer.from(await file.arrayBuffer()),file.type,purpose,ip)};
 });
}
