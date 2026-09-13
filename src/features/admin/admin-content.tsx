"use client";
import { ContentManager } from './content/content-manager';
export function AdminContent({initialTab='scripts'}:{initialTab?:'scripts'|'costumes'|'dms'}){return <ContentManager kind={initialTab}/>;}
