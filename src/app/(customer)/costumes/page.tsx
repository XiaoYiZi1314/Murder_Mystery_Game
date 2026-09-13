import { listCostumes } from '@/server/catalog/queries';
import { parseListQuery } from '@/server/catalog/validation';
import { LiveCatalog } from '@/features/catalog/live-catalog';
import { costumeCard } from '@/features/catalog/adapters';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams,p=new URLSearchParams();for(const [k,v] of Object.entries(params))if(typeof v==='string')p.set(k,v);
 const query=parseListQuery(p),result=await listCostumes(query,false);
 return <LiveCatalog kind="costumes" items={result.items.map(costumeCard)} total={result.total} query={query}/>;
}
