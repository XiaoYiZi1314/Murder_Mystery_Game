import type { NextRequest } from 'next/server';
import { withCommand } from '@/server/http/with-command';
import { assertPermission } from '@/server/auth/permissions';
import { adminSettings,saveSettings } from '@/server/settings/service';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){return withCommand(req,{auth:'required'},async({actor})=>({data:await adminSettings(assertPermission(actor,'settings.write'))}));}
export async function PUT(req:NextRequest){return withCommand(req,{auth:'required',idempotent:'settings.update'},async({actor,body,tx,ip})=>{const a=assertPermission(actor,'settings.write');if(!tx)throw new Error('Missing transaction');return {data:await saveSettings(a,body,tx,ip)};});}
