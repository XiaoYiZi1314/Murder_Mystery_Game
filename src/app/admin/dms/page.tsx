import { ContentManager } from '@/features/admin/content/content-manager';
import { requirePageActor } from '@/server/auth/page-actor';
import { prisma } from '@/server/db/prisma';
import { notFound } from 'next/navigation';
export default async function Page(){const actor=await requirePageActor('/admin/dms',['dm','manager','boss']);const dm=actor.role==='dm'?await prisma.dm.findUnique({where:{userId:BigInt(actor.userId)}}):null;if(actor.role==='dm'&&!dm)notFound();return <ContentManager kind="dms" selfDmId={dm?.id.toString()}/>;}
