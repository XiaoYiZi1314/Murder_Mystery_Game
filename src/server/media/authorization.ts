import type { Actor } from '../auth/session';
import { forbidden, unauthenticated, unprocessable } from '../http/errors';
import type { MediaAsset, MediaPurpose } from '@prisma/client';
export function authorizeUpload(actor:Actor|null,purpose:string): 'public'|'private' {
 if(!actor)throw unauthenticated();
 if(!['script_cover','script_character','costume','dm_photo','wechat_qrcode','report_evidence'].includes(purpose))throw unprocessable('未知媒体用途');
 if(purpose==='report_evidence')return 'private';
 if(actor.role==='manager'||actor.role==='boss')return 'public';
 if(actor.role==='dm'&&purpose==='dm_photo')return 'public';
 throw forbidden();
}
export function authorizeRead(actor:Actor|null,asset:Pick<MediaAsset,'visibility'|'ownerId'>) {
 if(asset.visibility==='public')return;
 if(!actor)throw unauthenticated();
 if(actor.role!=='boss'&&actor.userId!==asset.ownerId?.toString())throw forbidden();
}
export type Purpose = MediaPurpose;
