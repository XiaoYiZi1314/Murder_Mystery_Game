import type { ScriptSummaryDto,CostumeSummaryDto,DmPublicDto } from '@/lib/api/contracts';
export interface ContentCardData {id:string;href:string;title:string;image:string|null;summary:string;tags:string[];price?:string;players?:string;rating:string|null;}
export const scriptCard=(s:ScriptSummaryDto):ContentCardData=>({id:s.id,href:`/scripts/${s.slug}`,title:s.title,image:s.thumbnail??s.cover,summary:s.tagline??'',tags:s.tags,price:s.price,players:`${s.player_min}–${s.player_max} 人 · ${s.duration_minutes} 分钟`,rating:s.review_count?s.avg_rating:null});
export const costumeCard=(c:CostumeSummaryDto):ContentCardData=>({id:c.id,href:`/costumes/${c.slug??c.id}`,title:c.name,image:c.cover,summary:c.description??'',tags:[],rating:null});
export const dmCard=(d:DmPublicDto):ContentCardData=>({id:d.id,href:`/dms/${d.slug??d.id}`,title:d.name,image:d.avatar??d.photo,summary:d.bio??'',tags:d.specialty_tags,rating:d.rating});
