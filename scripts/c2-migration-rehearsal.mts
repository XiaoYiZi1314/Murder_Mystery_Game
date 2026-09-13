/** Disposable prefixed tables in shisanwu_test only. Never modifies existing tables or requires CREATE DATABASE privileges. */
import '../tests/integration/helpers';
import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {readFile} from 'node:fs/promises';
const db=new PrismaClient();const prefix=process.env.C2_REHEARSAL_CLEANUP_PREFIX??`c2r_${Date.now()}_`;
const initial=await readFile('prisma/migrations/20260912015828_init/migration.sql','utf8');
const safe=await readFile('prisma/upgrade/c2-safe.sql','utf8');
const tables=[...new Set([...initial.matchAll(/CREATE TABLE `([^`]+)`/g),...safe.matchAll(/CREATE TABLE `([^`]+)`/g)].map(m=>m[1]))];
const known=new Set(tables);
function rewrite(text:string){return text.replace(/`([a-zA-Z0-9_]+)`/g,(full,name)=>known.has(name)||name.endsWith('_fkey')?`\`${prefix}${name}\``:full).replace(/(?<![a-zA-Z0-9_`])(ScriptTag|ScriptCostume|_CostumeToScript|Script|Costume|Tag|c2_legacy_costume)(?![a-zA-Z0-9_`])/g, name=>`\`${prefix}${name}\``);}
async function sql(file:string){for(const s of (await readFile(file,'utf8')).split(';').map(x=>x.trim()).filter(Boolean))await db.$executeRawUnsafe(rewrite(s));}
async function execute(text:string){return db.$executeRawUnsafe(rewrite(text));}
async function query<T>(text:string){return db.$queryRawUnsafe<T>(rewrite(text));}
try{
 if(!/^c2r_\d{13}_$/.test(prefix))throw new Error('Invalid rehearsal prefix');
 if(process.env.C2_REHEARSAL_CLEANUP_PREFIX){console.log('Cleaning only prior rehearsal prefix',prefix);}else{
 await sql('prisma/migrations/20260912015828_init/migration.sql');
 await execute("INSERT INTO Script(slug,title,coverUrl,synopsis,durationMinutes,minPlayers,maxPlayers,difficulty,pricePerPlayer,status,tags,updatedAt) VALUES('legacy-share','旧剧本','/approved.jpg','背景',240,4,6,'beginner',168,'published',JSON_ARRAY('情感',' 城市 '),NOW(3))");
 await execute("INSERT INTO Costume(name,imageUrl,stockTotal,stockAvailable,status,updatedAt) VALUES('旧妆造','/costume.jpg',3,2,'available',NOW(3))");
 await execute('INSERT INTO _CostumeToScript(A,B) VALUES(1,1)');
 await sql('prisma/upgrade/c2-safe.sql');
 const [s]=await query<{slug:string;status:string}[]>('SELECT slug,status FROM Script');assert.equal(s.slug,'legacy-share');assert.equal(s.status,'on');
 const [c]=await query<{coverUrl:string;status:string}[]>('SELECT coverUrl,status FROM Costume');assert.equal(c.coverUrl,'/costume.jpg');assert.equal(c.status,'on');
 const tags=await query<{name:string}[]>('SELECT name FROM Tag ORDER BY name');assert.equal(tags.length,2);assert.ok(tags.some(t=>t.name==='城市'));
 assert.equal((await query<unknown[]>('SELECT * FROM ScriptTag')).length,2);assert.equal((await query<unknown[]>('SELECT * FROM ScriptCostume')).length,1);
 const [stock]=await query<{stockTotal:number}[]>('SELECT stockTotal FROM c2_legacy_costume');assert.equal(stock.stockTotal,3);
 console.log('PASS: C1 data-safe conversion preserved status, cover, slug, normalized tags, bidirectional relation and archived demo fields.');
}
}catch(error){console.error('Rehearsal failed before cleanup:',error);throw error;}finally{
 const rows=await db.$queryRaw<{TABLE_NAME:string;REFERENCED_TABLE_NAME:string|null}[]>`SELECT TABLE_NAME,REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL`;
 const remaining=new Set(tables.map(t=>prefix+t));
 while(remaining.size){const next=[...remaining].find(t=>!rows.some(r=>r.REFERENCED_TABLE_NAME?.toLowerCase()===t.toLowerCase()&&[...remaining].some(n=>n.toLowerCase()===r.TABLE_NAME.toLowerCase())&&r.TABLE_NAME.toLowerCase()!==t.toLowerCase()));if(!next)throw new Error('Unexpected rehearsal FK cycle; keep isolated tables for inspection');await db.$executeRawUnsafe(`DROP TABLE IF EXISTS \`${next}\``);remaining.delete(next);}
 await db.$disconnect();
}
