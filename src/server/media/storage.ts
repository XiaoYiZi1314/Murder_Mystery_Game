import { LocalStorage } from './local-storage';
export type Visibility = 'public' | 'private';
export interface StorageDriver {
 put(input: {key:string; bytes:Buffer; contentType:string; visibility:Visibility}): Promise<void>;
 read(key:string, visibility:Visibility): Promise<Buffer>;
 delete(key:string, visibility:Visibility): Promise<void>;
}
export function storage(): StorageDriver {
 if ((process.env.STORAGE_DRIVER ?? 'local') !== 'local') throw new Error('Storage driver not configured');
 return new LocalStorage(process.env.UPLOAD_PUBLIC_DIR ?? 'var/uploads', process.env.UPLOAD_PRIVATE_DIR ?? 'var/private-media');
}
