import { prisma } from '@/server/db/prisma';
import { storage } from '@/server/media/storage';
export const runtime='nodejs';
export async function GET(_req:Request,{params}:{params:Promise<{key:string}>}){
 const {key}=await params;
 if(!/^[a-f0-9]{32}(?:-thumb)?\.webp$/.test(key))return new Response(null,{status:404});
 const a=await prisma.mediaAsset.findUnique({where:{key:key.replace('-thumb.webp','.webp')}});
 if(!a||a.visibility!=='public')return new Response(null,{status:404});
 try{return new Response(new Uint8Array(await storage().read(key,'public')),{headers:{'Content-Type':'image/webp','X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=31536000, immutable'}});}catch{return new Response(null,{status:404});}
}
