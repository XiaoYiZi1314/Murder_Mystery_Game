/** Prevent standard deploy from applying the known destructive historical C2 migration. */
import {loadEnvFile} from '../src/server/config';
import {PrismaClient} from '@prisma/client';
loadEnvFile();const db=new PrismaClient();
try{
 const rows=await db.$queryRaw<{migration_name:string}[]>`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
 if(!rows.some(r=>r.migration_name==='20260913093727_content_media'))throw new Error('Pending historical C2 migration: use the backed-up, stopped-writer safe upgrade path in docs/c2-verification.md');
 console.log('C2 historical migration already accounted for; additive deploy allowed.');
}catch(e){console.error(e instanceof Error?e.message:'Migration guard failed');process.exitCode=1;}finally{await db.$disconnect();}
