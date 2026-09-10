"use client";

import { useMemo, useState } from "react";
import { Form, Input as AntInput, InputNumber, Modal, Select as AntSelect } from "antd";
import { Button, Input, useToast } from "@/components/ui";
import { AdminFrame, DemoNotice, PageHead, Segmented, StatusBadge } from "./admin-shared";

type SessionStatus = "草稿" | "开放报名" | "已锁车" | "开本中" | "待结算" | "已结束";
type SessionRow = { id: string; title: string; code: string; startsAt: string; time: string; dm: string; seats: string; note: string; status: SessionStatus };
type SessionForm = { script: string; dm: string; startsAt: string; capacity: number; note?: string };

const initialSessions: SessionRow[] = [
  { id: "managed-session-wugang", title: "雾港来信", code: "S-240614-01", startsAt: "2024-06-14T13:30", time: "06/14 13:30", dm: "阿岚", seats: "6 / 6", note: "", status: "已锁车" },
  { id: "managed-session-jinling", title: "金陵旧梦", code: "S-240615-02", startsAt: "2024-06-15T10:00", time: "06/15 10:00", dm: "小满", seats: "4 / 6", note: "", status: "开放报名" },
  { id: "managed-session-night", title: "长夜行", code: "S-240620-03", startsAt: "2024-06-20T19:00", time: "06/20 19:00", dm: "阿岚", seats: "8 / 8", note: "", status: "开本中" },
];

function tone(status: SessionStatus) {
  if (status === "开放报名" || status === "已结束") return "open" as const;
  if (status === "已锁车") return "locked" as const;
  if (status === "待结算" || status === "草稿") return "pending" as const;
  return "default" as const;
}

export function AdminSessions() {
  const toast = useToast();
  const [sessions, setSessions] = useState(initialSessions);
  const [statusFilter, setStatusFilter] = useState("全部");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<SessionRow | "new" | null>(null);
  const [deposit, setDeposit] = useState<SessionRow | null>(null);
  const [form] = Form.useForm<SessionForm>();

  const visible = useMemo(() => sessions.filter((session) => {
    const matchesStatus = statusFilter === "全部" || session.status === statusFilter;
    const needle = query.trim().toLowerCase();
    return matchesStatus && (!needle || `${session.title} ${session.dm} ${session.code}`.toLowerCase().includes(needle));
  }), [query, sessions, statusFilter]);

  function openEditor(session: SessionRow | "new") {
    form.resetFields();
    setEditor(session);
    form.setFieldsValue(session === "new" ? { dm: "阿岚", capacity: 6, note: "" } : {
      script: session.title, dm: session.dm, startsAt: session.startsAt,
      capacity: Number(session.seats.split("/")[1] ?? 6), note: session.note,
    });
  }

  function closeEditor() {
    setEditor(null);
    form.resetFields();
  }

  function displayTime(startsAt: string) {
    return startsAt.slice(5, 16).replace("-", "/").replace("T", " ");
  }

  function saveSession(values: SessionForm) {
    if (editor === "new") {
      const number = sessions.length + 1;
      setSessions((rows) => [{ id: `managed-session-demo-${number}`, title: values.script, code: `S-DEMO-${String(number).padStart(2, "0")}`, startsAt: values.startsAt, time: displayTime(values.startsAt), dm: values.dm, seats: `0 / ${values.capacity}`, note: values.note ?? "", status: "草稿" }, ...rows]);
      toast("场次已创建为草稿 · 仅当前页面演示");
    } else if (editor) {
      setSessions((rows) => rows.map((row) => row.id === editor.id ? { ...row, title: values.script, startsAt: values.startsAt, time: displayTime(values.startsAt), dm: values.dm, seats: `${row.seats.split("/")[0].trim()} / ${values.capacity}`, note: values.note ?? "" } : row));
      toast("场次编辑已保存 · 仅当前页面演示");
    }
    closeEditor();
  }

  function updateStatus(id: string, status: SessionStatus, message: string) {
    setSessions((rows) => rows.map((row) => row.id === id ? { ...row, status } : row));
    toast(`${message} · 仅当前页面演示`);
  }

  function exportRows() {
    const csv = ["场次编号,剧本,时间,DM,人数,状态", ...visible.map((row) => [row.code, row.title, row.time, row.dm, row.seats, row.status].map((cell) => `"${cell}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "十三雾-场次.csv"; anchor.click(); URL.revokeObjectURL(url);
    toast("场次 CSV 已导出");
  }

  return (
    <AdminFrame screen="admin-sessions" active="sessions">
      <PageHead eyebrow="B 端 / 场次管理" title="把场次状态推进到下一步。" lead="草稿、开放报名、已锁车、开本中、已结束，每一次变化都要清楚且可追溯。">
        <Button variant="primary" onClick={() => openEditor("new")} data-od-id="create-session-cta">创建场次</Button>
      </PageHead>
      <section className="section" data-od-id="session-management">
        <div className="container">
          <div className="toolbar">
            <div className="toolbar-left">
              <Segmented value={statusFilter} onChange={setStatusFilter} options={["全部", "开放报名", "已锁车", "待结算"].map((value) => ({ value, label: value }))} />
            </div>
            <div className="toolbar-right">
              <Input style={{ width: 220 }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索剧本 / DM" aria-label="搜索剧本或 DM" />
              <Button variant="secondary" onClick={exportRows}>导出 CSV</Button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>场次</th><th>时间</th><th>DM</th><th>人数</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                {visible.map((session) => (
                  <tr key={session.id} data-od-id={session.id}>
                    <td><strong>{session.title}</strong><div className="meta">{session.code}</div></td>
                    <td className="num">{session.time}</td><td>{session.dm}</td><td className="num">{session.seats}</td>
                    <td><StatusBadge tone={tone(session.status)}>{session.status}</StatusBadge></td>
                    <td>
                      {session.status === "已锁车" && <><Button variant="ghost" onClick={() => toast("报名单已打开 · 仅当前页面演示")}>查看报名单</Button><Button variant="ghost" onClick={() => setDeposit(session)}>押金</Button></>}
                      {session.status === "开放报名" && <><Button variant="ghost" onClick={() => openEditor(session)}>编辑</Button><Button variant="ghost" onClick={() => setDeposit(session)}>押金</Button></>}
                      {session.status === "草稿" && <><Button variant="ghost" onClick={() => openEditor(session)}>编辑</Button><Button variant="ghost" onClick={() => updateStatus(session.id, "开放报名", "场次已开放报名")}>上架</Button></>}
                      {session.status === "开本中" && <><Button variant="ghost" onClick={() => updateStatus(session.id, "待结算", "已进入结算队列")}>结算</Button><Button variant="ghost" onClick={() => toast("状态已记录")}>更多</Button></>}
                      {session.status === "待结算" && <Button variant="ghost" onClick={() => updateStatus(session.id, "已结束", "场次结算已完成")}>完成结算</Button>}
                      {session.status === "已结束" && <Button variant="ghost" onClick={() => toast("已打开场次记录")}>查看记录</Button>}
                    </td>
                  </tr>
                ))}
                {!visible.length && <tr className="admin-empty-row"><td colSpan={6}><div className="empty"><strong>没有匹配的场次</strong>试试清除搜索或切换状态。</div></td></tr>}
              </tbody>
            </table>
          </div>
          <DemoNotice />
        </div>
      </section>

      <Modal className="admin-antd-modal" getContainer={false} open={editor !== null} onCancel={closeEditor} footer={null} destroyOnHidden title={<><p className="eyebrow">{editor === "new" ? "新建场次" : "编辑场次"}</p><span>{editor === "new" ? "安排下一桌。" : "更新这一桌。"}</span></>}>
        <Form form={form} layout="vertical" onFinish={saveSession} requiredMark={false}>
          <div className="form-grid">
            <Form.Item label="选择剧本" name="script" rules={[{ required: true, message: "请选择剧本" }]}><AntSelect options={["雾港来信", "金陵旧梦", "长夜行"].map((value) => ({ value, label: value }))} placeholder="请选择剧本" /></Form.Item>
            <Form.Item label="主 DM" name="dm" rules={[{ required: true }]}><AntSelect options={["阿岚", "小满"].map((value) => ({ value, label: value }))} /></Form.Item>
            <Form.Item label="开本时间" name="startsAt" rules={[{ required: true, message: "请选择开本时间" }]}><AntInput type="datetime-local" /></Form.Item>
            <Form.Item label="人数上限" name="capacity" rules={[{ required: true }]}><InputNumber min={2} max={20} /></Form.Item>
            <Form.Item className="span-2" label="场次备注" name="note"><AntInput.TextArea rows={4} placeholder="例如：适合新手、需提前准备妆造" /></Form.Item>
          </div>
          <div className="admin-form-actions"><span className="field-help">先保存草稿，再决定何时开放报名。</span><Button variant="primary" type="submit">{editor === "new" ? "保存草稿" : "保存修改"}</Button></div>
        </Form>
      </Modal>

      <Modal className="admin-antd-modal" getContainer={false} open={deposit !== null} onCancel={() => setDeposit(null)} footer={null} destroyOnHidden title={<><p className="eyebrow">押金登记</p><span>确认这桌的押金。</span></>}>
        <p className="field-help">当前场次：{deposit?.title}</p>
        <Form layout="vertical" initialValues={{ amount: "¥300", handler: "店长" }} onFinish={() => { if (deposit) updateStatus(deposit.id, "已锁车", "押金登记已保存，场次可继续推进"); setDeposit(null); }} requiredMark={false}>
          <Form.Item label="已收押金" name="amount" rules={[{ required: true }]}><AntInput /></Form.Item>
          <Form.Item label="经手人" name="handler" rules={[{ required: true }]}><AntInput /></Form.Item>
          <Form.Item><label className="switch"><input type="checkbox" defaultChecked />我已核对线下转账记录</label></Form.Item>
          <Button variant="primary" type="submit">保存登记</Button>
        </Form>
      </Modal>
    </AdminFrame>
  );
}
