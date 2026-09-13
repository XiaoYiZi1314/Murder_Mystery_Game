import { listDms } from '@/server/catalog/queries';
import { parseListQuery } from '@/server/catalog/validation';
import { LiveCatalog } from '@/features/catalog/live-catalog';
import { dmCard } from '@/features/catalog/adapters';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams,p=new URLSearchParams();for(const [k,v] of Object.entries(params))if(typeof v==='string')p.set(k,v);
 const query=parseListQuery(p),result=await listDms(query,false);
 return <LiveCatalog kind="dms" items={result.items.map(dmCard)} total={result.total} query={query}/>;
}
