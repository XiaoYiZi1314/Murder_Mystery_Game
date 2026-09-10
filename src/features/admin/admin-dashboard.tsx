"use client";

import { Button, useToast } from "@/components/ui";
import { AdminFrame, DemoNotice, MetricGrid, PageHead, StatusBadge } from "./admin-shared";

const todaySessions = [
  { id: "admin-session-1", title: "金陵旧梦 · 10:00", detail: "DM：小满 · 4 / 6 人 · 还差 2 人", status: "开放报名", tone: "open" as const, meta: "押金", value: "待登记", action: "处理", message: "已打开押金登记" },
  { id: "admin-session-2", title: "雾港来信 · 13:30", detail: "DM：阿岚 · 6 / 6 人 · 已锁车", status: "已锁车", tone: "locked" as const, meta: "押金", value: "6 / 6", action: "查看", message: "已打开报名单" },
  { id: "admin-session-3", title: "长夜行 · 19:00", detail: "DM：阿岚 · 8 / 8 人 · 开本中", status: "开本中", tone: "default" as const, meta: "带本 DM", value: "待结算", action: "结算", message: "已打开待结算" },
];

export function AdminDashboard() {
  const toast = useToast();

  return (
    <AdminFrame screen="admin" active="dashboard">
      <PageHead
        eyebrow="B 端 / 工作台"
        title="今天，先把该确认的确认掉。"
        lead="场次、审核、押金和待结算，按今天的运营顺序排在前面。"
      >
        <>
          <Button variant="primary" href="/admin/sessions" data-od-id="admin-primary-cta">创建场次</Button>
          <Button variant="secondary" href="/admin/ops" data-od-id="admin-ops-cta">处理待办</Button>
        </>
      </PageHead>

      <section className="section" data-od-id="admin-metrics">
        <MetricGrid items={[
          { value: "3", label: "今日场次" },
          { value: "2", label: "待审核自主预约" },
          { value: "¥536", label: "待结算金额" },
          { value: "1", label: "新举报 · 仅 BOSS 可见" },
        ]} />
      </section>

      <section className="section" data-od-id="admin-today">
        <div className="container grid-2-1">
          <div className="stack">
            <div className="row-between">
              <div><p className="eyebrow">今日场次</p><h2>按时间推进，不漏任何一步。</h2></div>
              <Button variant="ghost" href="/admin/sessions">进入场次管理 →</Button>
            </div>
            <div className="data-list">
              {todaySessions.map((session) => (
                <div className="data-row" data-od-id={session.id} key={session.id}>
                  <div className="main"><strong>{session.title}</strong><span>{session.detail}</span></div>
                  <div><StatusBadge tone={session.tone}>{session.status}</StatusBadge></div>
                  <div><span className="meta">{session.meta}</span><strong>{session.value}</strong></div>
                  <div><Button variant="secondary" onClick={() => toast(session.message)}>{session.action}</Button></div>
                </div>
              ))}
            </div>
          </div>
          <aside className="stack">
            <div className="dark-panel" data-od-id="admin-todos">
              <p className="eyebrow" style={{ color: "var(--bg)" }}>待办</p>
              <div className="stack" style={{ gap: 16 }}>
                {[["自主预约审核", "2"], ["待登记押金", "1"], ["待结算场次", "1"], ["待回复评价", "3"]].map(([label, value], index) => (
                  <div key={label}>
                    {index > 0 && <hr className="rule" style={{ marginBottom: 16 }} />}
                    <div className="row-between"><span className="muted">{label}</span><strong>{value}</strong></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="notice"><strong>运营提醒</strong><p>锁车动作需要先确认押金到账，再推进场次状态。</p></div>
            <DemoNotice />
          </aside>
        </div>
      </section>
    </AdminFrame>
  );
}
