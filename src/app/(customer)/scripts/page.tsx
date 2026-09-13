import { listScripts } from '@/server/catalog/queries';
import { parseListQuery } from '@/server/catalog/validation';
import { LiveCatalog } from '@/features/catalog/live-catalog';
import { scriptCard } from '@/features/catalog/adapters';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams,p=new URLSearchParams();for(const [k,v] of Object.entries(params))if(typeof v==='string')p.set(k,v);
 const query=parseListQuery(p),result=await listScripts(query,null);
 return <LiveCatalog kind="scripts" items={result.items.map(scriptCard)} total={result.total} query={query}/>;
}
