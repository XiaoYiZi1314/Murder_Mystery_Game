import { notFound } from 'next/navigation';
import { getCostumeDetail } from '@/server/catalog/queries';
import { LiveCostumeDetail } from '@/features/catalog/live-catalog';
import { ApiError } from '@/server/http/errors';

export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const actor=null;
 const data=await getCostumeDetail(id,actor,false).catch(e=>{if(e instanceof ApiError&&e.status===404)notFound();throw e;});
 return <LiveCostumeDetail costume={data}/>;
}
