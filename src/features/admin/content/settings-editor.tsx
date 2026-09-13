'use client';
import { useState } from 'react';
import { useQuery,useMutation } from '@tanstack/react-query';
import { Alert,Button,Form,Switch } from 'antd';
import Link from 'next/link';
import { apiFetch,ApiClientError,getCsrfToken } from '@/lib/api/client';
import { AdminFrame,PageHead } from '../admin-shared';
import { MediaField } from './media-field';
import './content.css';
type Settings={wechat_qrcode:string|null;notify_push_enabled:boolean;versions:Record<string,string|null>};
export function SettingsEditor(){
 const [saved,setSaved]=useState(false),[form]=Form.useForm<Settings>();
 const query=useQuery({queryKey:['settings'],queryFn:()=>apiFetch<Settings>('/api/admin/settings')});
 const mutation=useMutation({mutationFn:async(values:Settings)=>apiFetch('/api/admin/settings',{method:'PUT',body:{...values,wechat_qrcode:values.wechat_qrcode||null,versions:query.data?.versions},csrf:await getCsrfToken(true),idempotencyKey:crypto.randomUUID()}),onSuccess:()=>{setSaved(true);void query.refetch();},onError:e=>{if(e instanceof ApiClientError&&e.fieldErrors)for(const [name,errors] of Object.entries(e.fieldErrors)){if(name==='wechat_qrcode'||name==='notify_push_enabled')form.setFields([{name,errors}]);}}});
 return <AdminFrame screen="admin-content" active="content"><PageHead eyebrow="B 端 / 门店设置" title="把展示信息维护清楚。" lead="D11：店长与 BOSS 可修改以下白名单字段。通知配置由后续渠道消费，不影响审计和账本。"/><section className="section"><div className="container"><Link href="/admin/scripts">管理首页精选 →</Link><p>精选唯一来源为剧本的“首页精选”开关，不在设置中重复存储。</p>
 {query.isPending?<p>加载中…</p>:query.error?<Alert type="error" title={query.error.message}/>:<Form key={JSON.stringify(query.data?.versions)} form={form} initialValues={query.data} layout="vertical" onValuesChange={()=>setSaved(false)} onFinish={v=>{setSaved(false);mutation.mutate(v);}} disabled={mutation.isPending}>
 <Form.Item name="wechat_qrcode" label="商家微信二维码"><MediaField purpose="wechat_qrcode"/></Form.Item><Form.Item name="notify_push_enabled" label="允许业务 Web Push 通知（C3/C8 接入渠道）" valuePropName="checked"><Switch/></Form.Item><Button type="primary" htmlType="submit" loading={mutation.isPending}>保存设置</Button></Form>}
 {saved&&<Alert type="success" title="已保存服务端配置"/>}{mutation.error&&<Alert type="error" title={mutation.error.message} action={<Button onClick={()=>{mutation.reset();void query.refetch();}}>重新加载（放弃当前修改）</Button>}/>}</div></section></AdminFrame>;
}
