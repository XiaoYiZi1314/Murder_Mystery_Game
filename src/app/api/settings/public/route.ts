import { publicSettings } from '@/server/settings/service';
import { ok } from '@/server/http/response';
export const dynamic='force-dynamic';
export async function GET(){return ok(await publicSettings(),200,'OK',{'Cache-Control':'no-store'});}
