import assert from 'node:assert/strict';
import test,{before,after} from 'node:test';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { BASE_URL,Jar,api,uniquePhone,trackPhone,cleanupTestUsers } from './helpers';
import type { UserRole } from '../../src/types/domain';
const actors=new Map<string,{jar:Jar;csrf:string;id:string;dmId?:string}>();
const ids:string[]=[];let png:Buffer;
let oldSettings:unknown[]=[];
before(async()=>{
 const {prisma}=await import('../../src/server/db/prisma');
 const {createSession,buildSessionCookie}=await import('../../src/server/auth/session');
 for(const role of ['manager','boss','dm','customer','other'] as const){
  const user=await prisma.user.create({data:{phone:trackPhone(uniquePhone()),nickname:`媒体测试-${role}`,passwordHash:'unused-test-session',role:role==='other'?'customer':role as UserRole,status:'active'}});
  const dm=role==='dm'?await prisma.dm.create({data:{userId:user.id}}):null;
  const session=await createSession(user.id.toString(),user.role),jar=new Jar();jar.cookie=buildSessionCookie(session.token).split(';')[0];
  actors.set(role,{jar,csrf:session.csrfToken,id:user.id.toString(),dmId:dm?.id.toString()});
 }
 png=await sharp({create:{width:96,height:128,channels:3,background:'#cccccc'}}).png().toBuffer();
 oldSettings=await prisma.setting.findMany({where:{key:{in:['wechat_qrcode','notify_push_enabled']}}});
});
after(async()=>{
 const {prisma}=await import('../../src/server/db/prisma');
 const {LocalStorage}=await import('../../src/server/media/local-storage');const store=new LocalStorage('var/test-uploads','var/test-private-media');
 await prisma.mediaReference.deleteMany({where:{assetId:{in:ids.map(BigInt)}}});
 const rows=await prisma.mediaAsset.findMany({where:{id:{in:ids.map(BigInt)}}});
 await prisma.mediaAsset.deleteMany({where:{id:{in:ids.map(BigInt)}}});
 for(const a of rows){await store.delete(a.key,a.visibility);await store.delete(a.key.replace('.webp','-thumb.webp'),a.visibility);}
 // Restore only the two settings touched by this serial test suite.
 await prisma.setting.deleteMany({where:{key:{in:['wechat_qrcode','notify_push_enabled']}}});
 for(const r of oldSettings as {key:string;value:object;updatedAt:Date}[])await prisma.setting.create({data:r});
 await cleanupTestUsers();
 const {redis}=await import("../../src/server/db/redis");await redis().quit();await prisma.$disconnect();
});
async function upload(role:string,purpose:string,bytes=png,mime='image/png',name='fixture.png'){
 const actor=actors.get(role),form=new FormData();form.set('purpose',purpose);form.set('file',new Blob([new Uint8Array(bytes)],{type:mime}),name);
 const res=await fetch(`${BASE_URL}/api/uploads`,{method:'POST',headers:{Origin:new URL(BASE_URL).origin,...(actor?{Cookie:actor.jar.cookie,'X-CSRF-Token':actor.csrf}:{})},body:form});
 const json=await res.json();if(res.status===201)ids.push(json.data.id);return {res,json};
}
async function settings(role:string,body?:unknown){const a=actors.get(role)!;return api('/api/admin/settings',{jar:a.jar,method:body?'PUT':'GET',body,csrf:a.csrf,headers:{'Idempotency-Key':randomUUID()}});}
test('HTTP media purpose and authentication matrix',async()=>{
 assert.equal((await upload('anonymous','script_cover')).res.status,401);
 assert.equal((await upload('customer','script_cover')).res.status,403);
 assert.equal((await upload('dm','costume')).res.status,403);
 assert.equal((await upload('dm','dm_photo')).res.status,201);
 assert.equal((await upload('manager','script_cover')).res.status,201);
 assert.equal((await upload('boss','wechat_qrcode')).res.status,201);
});
test('HTTP forged/corrupt/oversized/traversal images rejected',async()=>{
 for(const [bytes,mime,name] of [[Buffer.from('text'),'image/png','bad.png'],[png,'image/jpeg','bad.jpg'],[png.subarray(0,20),'image/png','broken.png'],[Buffer.alloc(5*1024*1024+1),'image/png','large.png'],[png,'image/png','../outside.png'],[Buffer.from('<svg/>'),'image/svg+xml','bad.svg']] as const){
  const r=await upload('manager','script_cover',bytes,mime,name);assert.equal(r.res.status,422,`${name}: ${JSON.stringify(r.json)}`);
 }
});
test('Public reencoded image+thumbnail and private anti-enumeration access',async()=>{
 const pub=await upload('manager','script_cover');assert.equal(pub.res.status,201);
 for(const url of [pub.json.data.url,pub.json.data.thumbnail_url]){const r=await fetch(`${BASE_URL}${url}`);assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/webp');}
 const a=await upload('customer','report_evidence');assert.equal(a.res.status,201);assert.ok(a.json.data.url.startsWith('/api/media/'));assert.equal(a.json.data.thumbnail_url,null);
 const {prisma}=await import('../../src/server/db/prisma');const stored=await prisma.mediaAsset.findUniqueOrThrow({where:{id:BigInt(a.json.data.id)}});
 assert.equal(stored.url,'');assert.equal((await fetch(`${BASE_URL}/uploads/${stored.key}`)).status,404);
 for(const role of ['anonymous','other','manager','customer','boss']){
  const jar=actors.get(role)?.jar;const r=await fetch(`${BASE_URL}${a.json.data.url}`,{headers:jar?{Cookie:jar.cookie}:{}});
  assert.equal(r.status,role==='anonymous'?401:['customer','boss'].includes(role)?200:403);
  if(r.ok)assert.match(r.headers.get('cache-control')??'',/no-store/);
 }
});
test('D11 settings role matrix, public whitelist and stale update',async()=>{
 for(const role of ['customer','dm'])assert.equal((await settings(role)).status,403);
 const q=await upload('manager','wechat_qrcode');assert.equal(q.res.status,201);
 const read=await settings('manager');assert.equal(read.status,200);
 const write=await settings('manager',{wechat_qrcode:q.json.data.url,notify_push_enabled:true,versions:read.json.data.versions});assert.equal(write.status,200,JSON.stringify(write.json));
 const stale=await settings('boss',{notify_push_enabled:false,versions:read.json.data.versions});assert.equal(stale.status,409);
 const read2=await settings('boss');assert.equal((await settings('boss',{notify_push_enabled:false,versions:read2.json.data.versions})).status,200);
 for(const role of ['dm','customer'])assert.equal((await settings(role,{notify_push_enabled:false,versions:read2.json.data.versions})).status,403);
 assert.equal((await settings('manager',{secret:'x',versions:read2.json.data.versions})).status,422);
 const pub=await api('/api/settings/public');assert.equal(pub.status,200);assert.equal(pub.json.data.wechat_qrcode,q.json.data.url);assert.ok(!('notify_push_enabled' in pub.json.data));assert.ok(!('versions' in pub.json.data));
 const {prisma}=await import('../../src/server/db/prisma');assert.ok(await prisma.operationLog.count({where:{action:'settings.update',actorId:BigInt(actors.get('manager')!.id)}}));
});
test('DM cannot attach another owner photo, content rejects arbitrary URLs',async()=>{
 const photo=await upload('manager','dm_photo'),d=actors.get('dm')!;
 const detail=await api(`/api/admin/dms/${d.dmId}`,{jar:d.jar});assert.equal(detail.status,200);
 const save=await api(`/api/admin/dms/${d.dmId}`,{method:'PATCH',jar:d.jar,csrf:d.csrf,headers:{'Idempotency-Key':randomUUID()},body:{avatar:photo.json.data.url,updated_at:detail.json.data.updated_at}});assert.equal(save.status,403);
 const {prisma}=await import('../../src/server/db/prisma');const {validateMedia}=await import('../../src/server/media/service');
 await assert.rejects(()=>prisma.$transaction(tx=>validateMedia(tx,{userId:actors.get('manager')!.id,role:'manager'},['//evil.example/a.png'],['cover'])));
});


test('DB failure compensates new files; orphan grace and references protect media',async()=>{
 const {readdir,rm}=await import('node:fs/promises');
 const {uploadImage,cleanupOrphans}=await import('../../src/server/media/service');
 const {prisma}=await import('../../src/server/db/prisma');
 const root=`var/c2-rollback-${randomUUID()}`,prevPublic=process.env.UPLOAD_PUBLIC_DIR,prevPrivate=process.env.UPLOAD_PRIVATE_DIR;
 process.env.UPLOAD_PUBLIC_DIR=`${root}/public`;process.env.UPLOAD_PRIVATE_DIR=`${root}/private`;
 try{
  await assert.rejects(()=>uploadImage({userId:'9223372036854775806',role:'manager'},png,'image/png','script_cover','test'));
  assert.deepEqual(await readdir(`${root}/public`),[]);
  const a=await uploadImage({userId:actors.get('manager')!.id,role:'manager'},png,'image/png','script_cover','test');ids.push(a.id);
  assert.equal(await cleanupOrphans(7,[BigInt(a.id)]),0,'grace period protects fresh images');
  await prisma.mediaAsset.update({where:{id:BigInt(a.id)},data:{createdAt:new Date(Date.now()-8*86400000)}});
  await prisma.mediaReference.create({data:{assetId:BigInt(a.id),entityType:'test',entityId:'protected'}});
  assert.equal(await cleanupOrphans(7,[BigInt(a.id)]),0,'referenced images are never removed');
  await prisma.mediaReference.deleteMany({where:{assetId:BigInt(a.id)}});
  assert.equal(await cleanupOrphans(7,[BigInt(a.id)]),1);assert.deepEqual(await readdir(`${root}/public`),[]);
 }finally{
  if(prevPublic===undefined)delete process.env.UPLOAD_PUBLIC_DIR;else process.env.UPLOAD_PUBLIC_DIR=prevPublic;
  if(prevPrivate===undefined)delete process.env.UPLOAD_PRIVATE_DIR;else process.env.UPLOAD_PRIVATE_DIR=prevPrivate;
  await rm(root,{recursive:true,force:true});
 }
});
