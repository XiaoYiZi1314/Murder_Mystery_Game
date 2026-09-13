/** Guarded C1 -> C2 conversion. Dry run by default. DDL is not transactional: retain archives and backup. */
import { loadEnvFile } from '../src/server/config';
import { PrismaClient } from '@prisma/client';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
loadEnvFile();
const db=new PrismaClient();
const args=process.argv.slice(2);
async function sql(file:string){for(const statement of (await readFile(file,'utf8')).split(';').map(x=>x.trim()).filter(Boolean))await db.$executeRawUnsafe(statement);}
function mark(name:string){const result=spawnSync(process.platform==='win32'?'npx.cmd':'npx',['prisma','migrate','resolve','--applied',name],{stdio:'inherit',shell:process.platform==='win32'});if(result.status!==0)throw new Error(`Migration journal failed: ${name}`);}
try{
 const [{name}]=await db.$queryRaw<{name:string}[]>`SELECT DATABASE() AS name`;
 const tables=await db.$queryRawUnsafe<Record<string,string>[]>('SHOW TABLES');const names=tables.map(r=>Object.values(r)[0]);
 const has=(s:string)=>names.some(n=>n.toLowerCase()===s.toLowerCase());
 if(has('_prisma_migrations')){const applied=await db.$queryRaw<{migration_name:string}[]>`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  if(applied.some(m=>m.migration_name==='20260913093727_content_media')){console.log(`Database ${name}: historical C2 already applied. No mutation. Lost pre-C2 fields, if any, require the original backup.`);process.exitCode=0;}
  else await upgrade(name,names,has('User'));
 }else await upgrade(name,names,has('User'));
}finally{await db.$disconnect();}
async function upgrade(name:string,names:string[],hasC1:boolean){
 if(names.some(n=>n.startsWith('c2_legacy_')))throw new Error('Archive tables already exist: possible partial upgrade. Stop and inspect, do not rerun blindly.');
 if(hasC1){
  const scripts=await db.$queryRawUnsafe<{id:bigint;tags:unknown}[]>('SELECT id,tags FROM Script');
  for(const s of scripts)if(s.tags!==null&&(!Array.isArray(s.tags)||s.tags.some(t=>typeof t!=='string'||!t.trim()||t.trim().length>40)))throw new Error(`Script ${s.id}: resolve invalid legacy tags before conversion`);
 }
 console.log(`Target database: ${name}. Safe upgrade preserves covers, statuses, tags and costume links; archives demo inventory/difficulty.`);
 if(!args.includes('--apply')){console.log('DRY RUN. Required: --apply --backup-confirmed --writers-stopped --confirm-database='+name);return;}
 if(!args.includes('--backup-confirmed')||!args.includes('--writers-stopped')||!args.includes('--confirm-database='+name))throw new Error('Explicit backup / stopped-writers / exact-target confirmations required');
 const dump:Record<string,unknown>={};for(const t of names){if(!/^[a-zA-Z0-9_]+$/.test(t))throw new Error('Unexpected table name');dump[t]=await db.$queryRawUnsafe(`SELECT * FROM \`${t}\``);}
 await mkdir('backups',{recursive:true});const backup=`backups/c2-before-${name}-${Date.now()}.json`;await writeFile(backup,JSON.stringify(dump,(_,v)=>typeof v==='bigint'?v.toString():v));console.log('Additional data export:',backup);
 if(!hasC1){await sql('prisma/migrations/20260912015828_init/migration.sql');mark('20260912015828_init');}
 await sql('prisma/upgrade/c2-safe.sql');mark('20260913093727_content_media');
 console.log('Safe C2 data conversion completed. Run npm run prisma:migrate for additive migrations. Retain backup and c2_legacy_* until verified.');
}
