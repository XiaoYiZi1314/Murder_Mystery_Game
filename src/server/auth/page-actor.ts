import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { getSessionFromRequest } from './session';
export async function pageActor(){return (await getSessionFromRequest(new Request('http://internal',{headers:await headers()})))?.actor??null;}
export async function requirePageActor(returnTo:string,roles?:readonly string[]){
 const actor=await pageActor();if(!actor)redirect(`/login?next=${encodeURIComponent(returnTo)}`);
 if(roles&&!roles.includes(actor.role))notFound();
 return actor;
}
