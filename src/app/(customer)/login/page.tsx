import { AuthPage } from '@/features/member/AuthPage';
export default async function Page({searchParams}:{searchParams:Promise<{next?:string}>}){const {next}=await searchParams;const returnTo=next&&/^\/(?!\/)[a-zA-Z0-9/?=&%._~-]*$/.test(next)?next:'/me';return <AuthPage initialTab="login" returnTo={returnTo}/>;}
