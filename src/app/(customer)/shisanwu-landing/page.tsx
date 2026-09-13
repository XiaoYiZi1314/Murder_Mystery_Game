import { HomePage } from '@/features/home/home-page';
import { homeContent } from '@/server/catalog/home';
export const dynamic='force-dynamic';
export default async function Page(){return <HomePage variant="landing" data={await homeContent()}/>;}
