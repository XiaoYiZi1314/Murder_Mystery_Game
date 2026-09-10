"use client";

import { useMemo, useState } from "react";
import { Form, Input as AntInput, Modal } from "antd";
import { Button, Input, useToast } from "@/components/ui";
import { AdminFrame, DemoNotice, EmptyState, PageHead, Segmented, StatusBadge } from "./admin-shared";

type ContentTab = "scripts" | "costumes" | "dms";
type ScriptStatus = "已上架" | "草稿" | "已下架";
type ScriptRow = { id: string; title: string; edited: string; type: string; players: string; price: string; duration: string; synopsis: string; status: ScriptStatus };
type ScriptForm = Pick<ScriptRow, "title" | "type" | "players" | "price" | "duration" | "synopsis">;

const initialScripts: ScriptRow[] = [
  { id: "wugang", title: "雾港来信", edited: "06/05", type: "情感 · 城市", players: "5", price: "¥268", duration: "约 4.5 小时", synopsis: "", status: "已上架" },
  { id: "jinling", title: "金陵旧梦", edited: "05/28", type: "情感 · 民国", players: "4–6", price: "¥238", duration: "约 4 小时", synopsis: "", status: "已上架" },
  { id: "night", title: "长夜行", edited: "05/18", type: "硬核 · 古风", players: "6–8", price: "¥298", duration: "约 5 小时", synopsis: "", status: "草稿" },
];

export function AdminContent({ initialTab = "scripts" }: { initialTab?: ContentTab }) {
  const toast = useToast();
  const [tab, setTab] = useState<ContentTab>(initialTab);
  const [scripts, setScripts] = useState(initialScripts);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ScriptRow | "new" | null>(null);
  const [form] = Form.useForm<ScriptForm>();
  const visible = useMemo(() => scripts.filter((script) => script.title.toLowerCase().includes(query.trim().toLowerCase())), [query, scripts]);

  function openEditor(script: ScriptRow | "new") {
    setEditing(script);
    form.setFieldsValue(script === "new" ? { title: "", type: "", price: "", players: "", duration: "", synopsis: "" } : script);
  }

  function save(values: ScriptForm) {
    if (editing === "new") {
      setScripts((rows) => [...rows, { ...values, id: `demo-${Date.now()}`, edited: "刚刚", status: "草稿" }]);
      toast("剧本已保存为草稿 · 仅当前页面演示");
    } else if (editing) {
      setScripts((rows) => rows.map((row) => row.id === editing.id ? { ...row, ...values, edited: "刚刚" } : row));
      toast("剧本编辑已保存 · 仅当前页面演示");
    }
    setEditing(null); form.resetFields();
  }

  function toggle(script: ScriptRow) {
    const next: ScriptStatus = script.status === "已上架" ? "已下架" : "已上架";
    setScripts((rows) => rows.map((row) => row.id === script.id ? { ...row, status: next } : row));
    toast(`${script.title}${next === "已上架" ? "已上架" : "已下架"} · 仅当前页面演示`);
  }

  return (
    <AdminFrame screen="admin-content" active="content">
      <PageHead eyebrow="B 端 / 内容管理" title="让每一本、每一位 DM，都有清楚的入口。" lead="剧本、妆造和 DM 是顾客选择前看到的三种内容资产；后台只保留少量必要操作，避免把体验做成表格迷宫。">
        <Button variant="primary" onClick={() => openEditor("new")} data-od-id="content-primary-cta">新增剧本</Button>
      </PageHead>
      <section className="section" data-od-id="content-tabs">
        <div className="container">
          <Segmented className="tabbar" value={tab} onChange={setTab} options={[
            { value: "scripts", label: <>剧本 <span className="meta">12</span></> },
            { value: "costumes", label: <>妆造 <span className="meta">8</span></> },
            { value: "dms", label: <>DM <span className="meta">5</span></> },
          ]} />
          {tab === "scripts" && <div data-panel="scripts" style={{ paddingTop: 24 }}>
            <div className="toolbar">
              <div className="toolbar-left"><StatusBadge tone="open">已上架 9</StatusBadge><StatusBadge>草稿 2</StatusBadge><StatusBadge tone="danger">已下架 1</StatusBadge></div>
              <div className="toolbar-right"><Input style={{ width: 220 }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索剧本" aria-label="搜索剧本" /></div>
            </div>
            <div className="table-wrap"><table><thead><tr><th>剧本</th><th>类型</th><th>人数</th><th>价格</th><th>状态</th><th>操作</th></tr></thead><tbody>
              {visible.map((script) => <tr key={script.id}>
                <td><strong>{script.title}</strong><div className="meta">最后编辑：{script.edited}</div></td><td>{script.type}</td><td className="num">{script.players}</td><td className="num">{script.price}</td>
                <td><StatusBadge tone={script.status === "已上架" ? "open" : script.status === "已下架" ? "danger" : "default"}>{script.status}</StatusBadge></td>
                <td><Button variant="ghost" onClick={() => openEditor(script)}>编辑</Button><Button variant="ghost" onClick={() => toggle(script)}>{script.status === "已上架" ? "下架" : "上架"}</Button></td>
              </tr>)}
            </tbody></table></div>
            <DemoNotice />
          </div>}
          {tab === "costumes" && <div data-panel="costumes" style={{ marginTop: 24 }}><EmptyState title="妆造资产"><p style={{ margin: "0 0 16px" }}>统一维护图片比例、描述和关联剧本。</p><Button variant="secondary" href="/admin/ops?tab=assets#asset-panel">进入妆造与 DM 维护</Button></EmptyState></div>}
          {tab === "dms" && <div data-panel="dms" style={{ marginTop: 24 }}><EmptyState title="DM 员工信息"><p style={{ margin: "0 0 16px" }}>DM 可编辑自己的主页，店长与 BOSS 负责账号与状态。</p><Button variant="secondary" href="/admin/ops?tab=assets#asset-panel">进入妆造与 DM 维护</Button></EmptyState></div>}
        </div>
      </section>
      <section className="section" data-od-id="content-highlight">
        <div className="container grid-2">
          <div className="surface-card"><p className="eyebrow">精选推荐</p><h3>首页当前精选：雾港来信、金陵旧梦</h3><p style={{ color: "var(--muted)", fontSize: 14 }}>精选位由后台配置，落地页与剧本列表共享同一份状态。</p><Button variant="secondary" onClick={() => toast("精选推荐已保存 · 仅当前页面演示")}>保存推荐顺序</Button></div>
          <div className="surface-card"><p className="eyebrow">员工可见性</p><h3>5 位 DM · 2 位店长 / BOSS</h3><p style={{ color: "var(--muted)", fontSize: 14 }}>账号、带本记录与操作权限分开呈现，不允许代登录顾客账号。</p><Button variant="secondary" href="/admin/ops?tab=assets#asset-panel">打开资产状态</Button></div>
        </div>
      </section>

      <Modal className="admin-antd-modal" getContainer={false} open={editing !== null} onCancel={() => setEditing(null)} footer={null} destroyOnHidden title={<><p className="eyebrow">{editing === "new" ? "新增剧本" : "编辑剧本"}</p><span>{editing === "new" ? "先把故事放进库里。" : "把故事信息更新清楚。"}</span></>}>
        <Form form={form} layout="vertical" onFinish={save} requiredMark={false}>
          <Form.Item label="剧本名称" name="title" rules={[{ required: true, message: "请输入剧本名称" }]}><AntInput placeholder="例如：雾港来信" /></Form.Item>
          <div className="form-grid">
            <Form.Item label="类型" name="type" rules={[{ required: true }]}><AntInput placeholder="情感 / 城市" /></Form.Item>
            <Form.Item label="价格" name="price" rules={[{ required: true }]}><AntInput placeholder="¥268" /></Form.Item>
            <Form.Item label="人数范围" name="players" rules={[{ required: true }]}><AntInput placeholder="5 人" /></Form.Item>
            <Form.Item label="时长" name="duration" rules={[{ required: true }]}><AntInput placeholder="约 4.5 小时" /></Form.Item>
          </div>
          <Form.Item label="非剧透简介" name="synopsis"><AntInput.TextArea rows={4} placeholder="让顾客知道自己将进入什么样的故事" /></Form.Item>
          <Button variant="primary" type="submit">{editing === "new" ? "保存草稿" : "保存修改"}</Button>
        </Form>
      </Modal>
    </AdminFrame>
  );
}
