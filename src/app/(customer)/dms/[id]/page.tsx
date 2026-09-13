import { notFound } from 'next/navigation';
import { getDmDetail } from '@/server/catalog/queries';
import { LiveDmDetail } from '@/features/catalog/live-catalog';
import { ApiError } from '@/server/http/errors';

export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const actor=null;
 const data=await getDmDetail(id,actor,false).catch(e=>{if(e instanceof ApiError&&e.status===404)notFound();throw e;});
 return <LiveDmDetail dm={data}/>;
}
