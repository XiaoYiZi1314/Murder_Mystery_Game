import type { NextRequest } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { getSessionFromRequest } from '@/server/auth/session';
import { authorizeRead } from '@/server/media/authorization';
import { storage } from '@/server/media/storage';
import { ApiError,notFound } from '@/server/http/errors';
import { fail } from '@/server/http/response';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;if(!/^[1-9]\d{0,18}$/.test(id))throw notFound();
  const asset=await prisma.mediaAsset.findUnique({where:{id:BigInt(id)}});if(!asset)throw notFound();
  authorizeRead((await getSessionFromRequest(req))?.actor??null,asset);
  const bytes=await storage().read(asset.key,asset.visibility);
  return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'image/webp','X-Content-Type-Options':'nosniff','Cache-Control':asset.visibility==='private'?'private, no-store':'public, max-age=31536000, immutable','Content-Security-Policy':"default-src 'none'",'Vary':'Cookie'}});
 }catch(e){if(e instanceof ApiError)return fail(e.code,e.message,e.status);return fail(4040,'资源不存在',404);}
}
