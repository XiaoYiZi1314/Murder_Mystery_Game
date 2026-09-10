"use client";

import { useMemo, useState } from "react";
import { Form, Input as AntInput, Select as AntSelect } from "antd";
import { Button, useToast } from "@/components/ui";
import { AdminFrame, DemoNotice, MetricGrid, PageHead, Segmented, StatusBadge } from "./admin-shared";

type Dimension = "本月" | "本季" | "本年";
type LedgerKind = "全部" | "充值" | "消费" | "押金";
type Ledger = { time: string; action: string; kind: Exclude<LedgerKind, "全部">; target: string; amount: string; handler: string };

const ledgers: Ledger[] = [
  { time: "06/08 22:14", action: "消费结算", kind: "消费", target: "长夜行 · 林间有雾等 8 人", amount: "¥2,384", handler: "阿岚" },
  { time: "06/02 18:20", action: "充值录入", kind: "充值", target: "林间有雾", amount: "+¥500", handler: "店长" },
  { time: "05/24 23:01", action: "押金退还", kind: "押金", target: "雾港来信 · 全员", amount: "-¥300", handler: "店长" },
];

const metricSets: Record<Dimension, Array<{ value: string; label: string }>> = {
  本月: [{ value: "¥8,420", label: "本月充值录入" }, { value: "¥5,860", label: "本月消费记账" }, { value: "¥1,200", label: "押金收取 · 含待退" }, { value: "9,260", label: "本月发放积分" }],
  本季: [{ value: "¥23,180", label: "本季充值录入" }, { value: "¥17,420", label: "本季消费记账" }, { value: "¥3,600", label: "押金收取 · 含待退" }, { value: "27,840", label: "本季发放积分" }],
  本年: [{ value: "¥68,920", label: "本年充值录入" }, { value: "¥51,760", label: "本年消费记账" }, { value: "¥10,800", label: "押金收取 · 含待退" }, { value: "83,520", label: "本年发放积分" }],
};

export function AdminFinance() {
  const toast = useToast();
  const [dimension, setDimension] = useState<Dimension>("本月");
  const [kind, setKind] = useState<LedgerKind>("全部");
  const [settled, setSettled] = useState(false);
  const visible = useMemo(() => ledgers.filter((row) => kind === "全部" || row.kind === kind), [kind]);

  function exportCsv() {
    const rows = ["时间,动作,对象,金额,经手人", ...visible.map((row) => [row.time, row.action, row.target, row.amount, row.handler].map((cell) => `"${cell}"`).join(","))];
    const url = URL.createObjectURL(new Blob(["\ufeff", rows.join("\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `十三雾-财务-${dimension}.csv`; link.click(); URL.revokeObjectURL(url);
    toast(`${dimension}报表已导出`);
  }

  return (
    <AdminFrame screen="admin-finance" active="finance">
      <PageHead eyebrow="B 端 / 财务" title="钱、积分与押金，都要对得上。" lead="余额、现金、微信直接收款与押金不混在一起；场次结束后，记账完成才会从待结算队列消失。">
        <>
          <Segmented value={dimension} onChange={setDimension} options={(["本月", "本季", "本年"] as Dimension[]).map((value) => ({ value, label: value }))} />
          <Button variant="primary" onClick={exportCsv}>导出{dimension} CSV</Button>
        </>
      </PageHead>
      <section className="section" data-od-id="finance-metrics"><MetricGrid items={metricSets[dimension]} /></section>
      <section className="section" data-od-id="settlement">
        <div className="container grid-2-1">
          <div className="stack">
            <div className="row-between"><div><p className="eyebrow">待结算场次</p><h2>结束之后，留下一笔清楚的账。</h2></div><StatusBadge tone={settled ? "open" : "pending"}>{settled ? "已清空" : "1 场待处理"}</StatusBadge></div>
            {!settled ? (
              <div className="card" data-od-id="pending-settlement-card">
                <div className="row-between"><div><h3>长夜行 · 06 月 08 日</h3><p style={{ color: "var(--muted)", fontSize: 14, margin: "6px 0 0" }}>带本 DM：阿岚 · 8 人 · 场次已结束</p></div><span className="num">应收 ¥2,384</span></div>
                <hr className="rule" style={{ margin: "20px 0" }} />
                <Form className="form-grid" layout="vertical" initialValues={{ method: "余额支付", amount: "¥2,384" }} onFinish={() => { setSettled(true); toast("结算已完成，流水与积分已生成 · 仅当前页面演示"); }} requiredMark={false}>
                  <Form.Item label="收款方式" name="method" rules={[{ required: true }]}><AntSelect options={["余额支付", "现金", "微信直接付"].map((value) => ({ value, label: value }))} /></Form.Item>
                  <Form.Item label="实收金额" name="amount" rules={[{ required: true }]}><AntInput /></Form.Item>
                  <Form.Item className="span-2"><label className="switch"><input type="checkbox" defaultChecked />按 1:1 发放本场积分（2,384 分）</label></Form.Item>
                  <div className="span-2" style={{ display: "flex", justifyContent: "flex-end" }}><Button variant="primary" type="submit">确认结算</Button></div>
                </Form>
              </div>
            ) : <div className="empty"><strong>待结算队列已清空</strong>本次结果只保留在当前页面，刷新后恢复演示数据。</div>}
          </div>
          <aside className="stack">
            <div className="dark-panel" data-od-id="finance-breakdown">
              <p className="eyebrow" style={{ color: "var(--bg)" }}>{dimension}构成</p>
              <div className="stack" style={{ gap: 15 }}>
                {[["余额消费", "¥3,420"], ["现金 / 微信", "¥2,440"], ["押金退还", "-¥900"], ["积分兑换", "-3,200"]].map(([label, value]) => <div className="row-between" key={label}><span className="muted">{label}</span><strong className="num">{value}</strong></div>)}
              </div>
            </div>
            <div className="notice"><strong>权限提醒</strong><p>财务报表、举报人与操作日志仅大 BOSS 可见；店长可完成记账但不能查看完整报表。</p></div>
            <DemoNotice />
          </aside>
        </div>
      </section>
      <section className="section" data-od-id="finance-ledger">
        <div className="container">
          <div className="row-between"><div><p className="eyebrow">最近流水</p><h2>按动作查，不靠记忆。</h2></div><Segmented value={kind} onChange={setKind} options={(["全部", "充值", "消费", "押金"] as LedgerKind[]).map((value) => ({ value, label: value }))} /></div>
          <div className="table-wrap" style={{ marginTop: 22 }}>
            <table><thead><tr><th>时间</th><th>动作</th><th>对象</th><th>金额</th><th>经手人</th></tr></thead><tbody>
              {visible.map((row) => <tr key={`${row.time}-${row.action}`}><td className="num">{row.time}</td><td>{row.action}</td><td>{row.target}</td><td className="num">{row.amount}</td><td>{row.handler}</td></tr>)}
            </tbody></table>
          </div>
        </div>
      </section>
    </AdminFrame>
  );
}
