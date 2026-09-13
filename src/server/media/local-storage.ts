import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { StorageDriver, Visibility } from './storage';
export class LocalStorage implements StorageDriver {
 private roots: Record<Visibility,string>;
 constructor(publicDir:string, privateDir:string) {
  const a=path.resolve(publicDir), b=path.resolve(privateDir);
  if(a===b || b.startsWith(a+path.sep) || a.startsWith(b+path.sep)) throw new Error('Public/private storage roots must be disjoint');
  this.roots={public:a,private:b};
 }
 private file(key:string,visibility:Visibility) {
  if(!/^[a-f0-9]{32}(?:-thumb)?\.webp$/.test(key)) throw new Error('Invalid storage key');
  return path.join(this.roots[visibility],key);
 }
 async put(input:{key:string;bytes:Buffer;contentType:string;visibility:Visibility}) {
  const file=this.file(input.key,input.visibility);
  await mkdir(this.roots[input.visibility],{recursive:true});
  await writeFile(file,input.bytes,{flag:'wx',mode:input.visibility==='private'?0o600:0o644});
 }
 async read(key:string,visibility:Visibility) { return readFile(this.file(key,visibility)); }
 async delete(key:string,visibility:Visibility) {
  try {await unlink(this.file(key,visibility));} catch(e) {if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 }
}
