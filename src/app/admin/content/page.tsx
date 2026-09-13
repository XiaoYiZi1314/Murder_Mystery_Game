import { redirect } from 'next/navigation';
import { requirePageActor } from '@/server/auth/page-actor';
export default async function Page(){const actor=await requirePageActor('/admin/content',['dm','manager','boss']);redirect(actor.role==='dm'?'/admin/dms':'/admin/scripts');}
