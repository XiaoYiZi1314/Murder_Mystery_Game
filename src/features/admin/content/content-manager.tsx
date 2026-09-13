'use client';
import { useState } from 'react';
import { useQuery,useMutation,useQueryClient } from '@tanstack/react-query';
import { Alert,Form,Input,InputNumber,Select,Switch,Modal,Button,Pagination,Popconfirm } from 'antd';
import Link from 'next/link';
import { apiFetch,ApiClientError,getCsrfToken } from '@/lib/api/client';
import { AdminFrame,PageHead,EmptyState } from '../admin-shared';
import { MediaField } from './media-field';
import './content.css';
type Kind='scripts'|'costumes'|'dms';
type Row={id:string;title?:string;name?:string;status?:string;updated_at?:string};
type Option={value:string;label:string;version?:string};
type Values=Record<string,unknown>;
const labels={scripts:'剧本',costumes:'妆造',dms:'DM'};
export function ContentManager({kind,selfDmId}:{kind:Kind;selfDmId?:string}){
 const client=useQueryClient(),[page,setPage]=useState(1),[q,setQ]=useState(''),[editing,setEditing]=useState<string|null>(null),[version,setVersion]=useState(''),[notice,setNotice]=useState(''),[tagName,setTagName]=useState('');
 const [form]=Form.useForm<Values>();
 const base=`/api/admin/${kind}`;
 const list=useQuery({queryKey:['content',kind,page,q,selfDmId],queryFn:()=>selfDmId?apiFetch<Row>(`${base}/${selfDmId}`).then(row=>({items:[row],page_info:{total:1}})):apiFetch<{items:Row[];page_info:{total:number}}>(`${base}?page=${page}&page_size=12&q=${encodeURIComponent(q)}`)});
 const options=useQuery({queryKey:['content-options',selfDmId],queryFn:async()=>{
  const collect=async(path:string):Promise<Row[]>=>{const all:Row[]=[];for(let p=1;p<=100;p++){const r=await apiFetch<{items:Row[];page_info:{total_pages:number}}>(`${path}?page=${p}&page_size=50`);all.push(...r.items);if(p>=r.page_info.total_pages)break;}return all;};
  const [tags,scripts,costumes,dms]=await Promise.all([apiFetch<Row[]>('/api/admin/tags'),selfDmId?[]:collect('/api/admin/scripts'),selfDmId?[]:collect('/api/admin/costumes'),selfDmId?[]:collect('/api/admin/dms')]);
  const to=(rows:Row[]):Option[]=>rows.map(r=>({value:r.id,label:r.title??r.name??r.id,version:r.updated_at}));
  return {tags:to(tags),scripts:to(scripts),costumes:to(costumes),dms:to(dms)};
 }});
 async function load(id:string){
  setNotice('');
  try{const detail=await apiFetch<Values>(`${base}/${id}`);setVersion(String(detail.updated_at));form.resetFields();form.setFieldsValue({...detail,dm_ids:(detail.dms as Row[]|undefined)?.map(x=>x.id),costume_ids:(detail.costumes as Row[]|undefined)?.map(x=>x.id),script_ids:(detail.scripts as Row[]|undefined)?.map(x=>x.id)});setEditing(id);save.reset();}catch(e){setNotice(e instanceof Error?e.message:'加载失败');}
 }
 const save=useMutation({mutationFn:async(values:Values)=>{
  const allowed=kind==='scripts'?['title','slug','cover','tagline','synopsis','duration_minutes','player_min','player_max','price','status','featured','tag_ids','dm_ids','costume_ids','characters']:kind==='costumes'?['name','slug','cover','images','description','status','script_ids']:['name','bio','avatar','photo','tag_ids',...(!selfDmId?['status','slug']:[])];
  const body=Object.fromEntries(allowed.filter(k=>values[k]!==undefined).map(k=>[k,values[k]]));
  if(kind==='scripts')body.characters=((values.characters??[]) as Values[]).map((c,i)=>({...c,sort:i,image:c.image||undefined}));
  if(editing!=='new')body.updated_at=version;
  return apiFetch(`${base}${editing==='new'?'':`/${editing}`}`,{method:editing==='new'?'POST':'PATCH',body,csrf:await getCsrfToken(true),idempotencyKey:crypto.randomUUID()});
 },onSuccess:()=>{setEditing(null);setNotice('已保存到数据库');void client.invalidateQueries({queryKey:['content']});void client.invalidateQueries({queryKey:['content-options']});},onError:e=>{if(e instanceof ApiClientError&&e.fieldErrors){form.setFields(Object.entries(e.fieldErrors).map(([name,errors])=>({name:name.replace(/\[(\d+)\]/g,'.$1').split('.').map(x=>/^\d+$/.test(x)?Number(x):x),errors})));const name=Object.keys(e.fieldErrors)[0];if(name)form.scrollToField(name);}}});
 const remove=useMutation({mutationFn:async(id:string)=>apiFetch(`${base}/${id}`,{method:'DELETE',csrf:await getCsrfToken(true),idempotencyKey:crypto.randomUUID()}),onSuccess:()=>{setNotice('已删除');void client.invalidateQueries({queryKey:['content']});},onError:e=>setNotice(e instanceof Error?e.message:'删除失败')});
 async function tagAction(id?:string,remove=false){try{await apiFetch(`/api/admin/tags${id?`/${id}`:''}`,{method:remove?'DELETE':id?'PATCH':'POST',body:remove?undefined:{name:tagName.trim(),...(id?{updated_at:options.data?.tags.find(t=>t.value===id)?.version}:{})},csrf:await getCsrfToken(true),idempotencyKey:crypto.randomUUID()});setTagName('');void options.refetch();}catch(e){setNotice(e instanceof Error?e.message:'标签操作失败');}}
 const select=(name:string,label:string,items?:Option[])=><Form.Item name={name} label={label}><Select mode="multiple" options={items??[]} optionFilterProp="label" loading={options.isPending}/></Form.Item>;
 const status=kind==='dms'?['active','inactive']:['draft','on','off'];
 return <AdminFrame screen="admin-content" active="content"><PageHead eyebrow="B 端 / 内容管理" title={`${labels[kind]}管理`} lead="真实内容、受控图片与版本校验。保存成功后刷新列表即可复核。">
 {!selfDmId&&kind!=='dms'&&<Button type="primary" onClick={()=>{form.resetFields();form.setFieldsValue({status:'draft',price:'0.00',player_min:4,player_max:6,duration_minutes:240,characters:[]});setEditing('new');save.reset();}}>新增{labels[kind]}</Button>}</PageHead>
 <section className="section"><div className="container"><nav className="content-nav" aria-label="内容管理">{(['scripts','costumes','dms'] as const).map(k=><Link key={k} href={`/admin/${k}`}>{labels[k]}</Link>)}{!selfDmId&&<Link href="/admin/settings">门店设置</Link>}</nav>
 {notice&&<Alert title={notice} closable onClose={()=>setNotice('')}/>}
 <Input.Search placeholder="搜索名称" aria-label="搜索内容" onSearch={value=>{setQ(value);setPage(1);}} allowClear/>
 {list.isPending?<p role="status">加载中…</p>:list.error?<Alert type="error" title={list.error.message} action={<Button onClick={()=>void list.refetch()}>重试</Button>}/>:<><div className="table-wrap"><table><thead><tr><th>名称</th><th>状态</th><th>操作</th></tr></thead><tbody>{list.data?.items.map(row=><tr key={row.id}><td>{row.title??row.name}</td><td>{row.status??'展示资料'}</td><td><Button onClick={()=>void load(row.id)}>编辑</Button>{kind!=='dms'&&<Popconfirm title="确认删除？存在引用时会拒绝删除，可改为下架。" onConfirm={()=>remove.mutateAsync(row.id)}><Button danger loading={remove.isPending}>删除</Button></Popconfirm>}</td></tr>)}</tbody></table></div>{!list.data?.items.length&&<EmptyState title="暂无内容">新增并保存内容后将在这里显示。</EmptyState>}<Pagination current={page} pageSize={12} total={list.data?.page_info.total??0} onChange={setPage} showSizeChanger={false}/></>}
 {!selfDmId&&<section className="surface-card"><h3>标签维护</h3><Input value={tagName} onChange={e=>setTagName(e.target.value)} placeholder="新名称（用于新增或重命名）"/><Button onClick={()=>void tagAction()}>新增标签</Button><div className="content-tags">{options.data?.tags.map(t=><span key={t.value}>{t.label} <Button size="small" onClick={()=>void tagAction(t.value)}>重命名</Button><Popconfirm title="删除标签？仍有引用将返回冲突。" onConfirm={()=>tagAction(t.value,true)}><Button size="small" danger>删除</Button></Popconfirm></span>)}</div></section>}
 </div></section>
 <Modal className="admin-antd-modal" getContainer={false} title={`${editing==='new'?'新增':'编辑'}${labels[kind]}`} open={editing!==null} onCancel={()=>!save.isPending&&setEditing(null)} footer={null} width={760} destroyOnHidden>
 {save.error&&<Alert type="error" title={save.error.message} action={save.error instanceof ApiClientError&&save.error.status===409?<Button onClick={()=>editing&&void load(editing)}>重新加载（放弃当前修改）</Button>:undefined}/>}
 <Form form={form} layout="vertical" onFinish={v=>save.mutate(v)} disabled={save.isPending}>
 {kind==='scripts'?<><Form.Item name="title" label="剧本名称" rules={[{required:true}]}><Input/></Form.Item><Form.Item name="slug" label="分享链接标识（保留原 slug）"><Input/></Form.Item><Form.Item name="cover" label="封面" rules={[{required:true}]}><MediaField purpose="script_cover"/></Form.Item><Form.Item name="synopsis" label="非剧透简介" rules={[{required:true}]}><Input.TextArea rows={4}/></Form.Item><Form.Item name="tagline" label="列表概要"><Input/></Form.Item><div className="form-grid"><Form.Item name="duration_minutes" label="分钟数" rules={[{required:true}]}><InputNumber min={1}/></Form.Item><Form.Item name="player_min" label="最少人数" rules={[{required:true}]}><InputNumber min={1}/></Form.Item><Form.Item name="player_max" label="最多人数" rules={[{required:true}]}><InputNumber min={1}/></Form.Item><Form.Item name="price" label="每人价格（元）" rules={[{required:true}]}><InputNumber stringMode min="0" precision={2}/></Form.Item></div><Form.Item name="featured" label="首页精选（唯一数据来源）" valuePropName="checked"><Switch/></Form.Item>{select('tag_ids','标签',options.data?.tags)}{select('dm_ids','可带 DM',options.data?.dms)}{select('costume_ids','关联妆造',options.data?.costumes)}
 <Form.List name="characters">{(fields,{add,remove,move})=><section><h3>非剧透角色</h3>{fields.map((f,i)=><fieldset key={f.key}><legend>角色 {i+1}</legend><Form.Item name={[f.name,'id']} hidden><Input/></Form.Item><Form.Item name={[f.name,'name']} label="角色名" rules={[{required:true}]}><Input/></Form.Item><Form.Item name={[f.name,'bio']} label="角色背景"><Input.TextArea/></Form.Item><Form.Item name={[f.name,'image']} label="角色图片"><MediaField purpose="script_character"/></Form.Item><Button disabled={i===0} onClick={()=>move(i,i-1)}>上移</Button><Button disabled={i===fields.length-1} onClick={()=>move(i,i+1)}>下移</Button><Button danger onClick={()=>remove(f.name)}>移除角色</Button></fieldset>)}<Button onClick={()=>add({name:'',bio:''})}>添加角色</Button></section>}</Form.List></>:kind==='costumes'?<><Form.Item name="slug" label="分享链接标识（保留原 slug）"><Input/></Form.Item><Form.Item name="name" label="妆造名称" rules={[{required:true}]}><Input/></Form.Item><Form.Item name="cover" label="封面" rules={[{required:true}]}><MediaField purpose="costume"/></Form.Item><Form.Item name="images" label="详情多图"><MediaField purpose="costume" multiple/></Form.Item><Form.Item name="description" label="说明"><Input.TextArea rows={4}/></Form.Item>{select('script_ids','关联剧本',options.data?.scripts)}</>:<><p>这里只修改公开展示资料，不修改账号权限。</p><Form.Item name="name" label="展示姓名"><Input/></Form.Item>{!selfDmId&&<Form.Item name="slug" label="分享链接标识"><Input/></Form.Item>}<Form.Item name="bio" label="个人介绍"><Input.TextArea rows={4}/></Form.Item><Form.Item name="avatar" label="头像"><MediaField purpose="dm_photo"/></Form.Item><Form.Item name="photo" label="照片"><MediaField purpose="dm_photo"/></Form.Item>{select('tag_ids','擅长标签',options.data?.tags)}</>}
 {!selfDmId&&<Form.Item name="status" label="展示状态" rules={[{required:true}]}><Select options={status.map(value=>({value,label:({draft:'草稿',on:'上架',off:'下架',active:'展示',inactive:'隐藏'} as Record<string,string>)[value]}))}/></Form.Item>}
 <Button type="primary" htmlType="submit" loading={save.isPending}>保存到数据库</Button></Form></Modal></AdminFrame>;
}
