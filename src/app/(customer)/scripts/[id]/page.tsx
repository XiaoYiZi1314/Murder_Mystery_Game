import { notFound } from 'next/navigation';
import { getScriptDetail } from '@/server/catalog/queries';
import { LiveScriptDetail } from '@/features/catalog/live-catalog';
import { ApiError } from '@/server/http/errors';
import { requirePageActor } from '@/server/auth/page-actor';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const actor=await requirePageActor(`/scripts/${encodeURIComponent(id)}`);
 const data=await getScriptDetail(id,actor).catch(e=>{if(e instanceof ApiError&&e.status===404)notFound();throw e;});
 return <LiveScriptDetail script={data}/>;
}
