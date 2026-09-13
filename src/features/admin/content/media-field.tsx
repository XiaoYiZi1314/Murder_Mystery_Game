'use client';
/* eslint-disable @next/next/no-img-element -- reencoded, authenticated same-origin assets */
import { useState } from 'react';
import { Alert, Upload, Button } from 'antd';
import { getCsrfToken } from '@/lib/api/client';
export function MediaField({value,onChange,purpose,multiple=false}:{value?:string|string[];onChange?:(value:string|string[])=>void;purpose:string;multiple?:boolean}){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const values=Array.isArray(value)?value:value?[value]:[];
 return <div><Upload accept="image/jpeg,image/png,image/webp" showUploadList={false} disabled={busy} beforeUpload={async file=>{
  setError('');setBusy(true);
  try{
   if(file.size>5*1024*1024)throw new Error('图片不能超过 5MB');
   const form=new FormData();form.set('purpose',purpose);form.set('file',file);
   const res=await fetch('/api/uploads',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':await getCsrfToken(true)},body:form});
   const json=await res.json();if(!res.ok||json.code!==0)throw new Error(json.message??'上传失败');
   onChange?.(multiple?[...values,json.data.url]:json.data.url);
  }catch(e){setError(e instanceof Error?e.message:'上传失败');}finally{setBusy(false);}
  return Upload.LIST_IGNORE;
 }}><Button loading={busy}>上传图片（≤5MB）</Button></Upload>
 <div className="content-media-list">{values.map((url,i)=><figure key={`${url}-${i}`}><img src={url} alt="已上传图片"/><Button size="small" onClick={()=>onChange?.(multiple?values.filter((_,n)=>n!==i):'')}>移除</Button></figure>)}</div>
 {error&&<Alert type="error" title={error}/>}</div>;
}
