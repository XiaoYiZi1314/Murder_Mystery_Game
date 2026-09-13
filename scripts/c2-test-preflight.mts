import '../tests/integration/helpers';
import { prisma } from '../src/server/db/prisma';
import { mkdir,writeFile } from 'node:fs/promises';
const rows=await prisma.$queryRaw<{db:string}[]>`SELECT DATABASE() AS db`;
if(rows[0]?.db!=='shisanwu_test')throw new Error('Refuse non-test database');
const tables=await prisma.$queryRawUnsafe<Record<string,string>[]>('SHOW TABLES');
const dump:Record<string,unknown>={};
for(const row of tables){const name=Object.values(row)[0];if(!/^[a-zA-Z0-9_]+$/.test(name))throw new Error('Unexpected table');dump[name]=await prisma.$queryRawUnsafe(`SELECT * FROM \`${name}\``);}
await mkdir('backups',{recursive:true});
const file=`backups/c2-test-${Date.now()}.json`;
await writeFile(file,JSON.stringify(dump,(_,v)=>typeof v==='bigint'?v.toString():v));
console.log(`Verified isolated database ${rows[0].db}; exported ${tables.length} tables to ${file}; no reset.`);
await prisma.$disconnect();
