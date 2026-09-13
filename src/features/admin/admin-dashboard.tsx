"use client";
import Link from "next/link";
import { AdminFrame, PageHead } from "./admin-shared";
import { SessionCard } from "@/features/booking/session-card";
import type { SessionDto } from "@/features/booking/types";
export function AdminDashboard({
  sessions = [],
  todayTotal = 0,
  pending = 0,
}: {
  sessions?: SessionDto[];
  todayTotal?: number;
  pending?: number;
}) {
  return (
    <AdminFrame screen="admin" active="dashboard">
      <PageHead
        eyebrow="B 端 / 工作台"
        title="今天的故事，从这里开始。"
        lead="北京时间今日排期与待审核申请；金额/履约统计由后续周期接入。"
      />
      <section className="section">
        <div className="container">
          <div className="c3-actions">
            <Link href="/admin/sessions">今日场次 {todayTotal} 场</Link>
            <Link href="/admin/sessions/pending">待审核 {pending} 份</Link>
            <Link href="/admin/bookings">报名名单</Link>
          </div>
          <div className="c3-grid">
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
          {!sessions.length && <p>今日暂无场次。</p>}
        </div>
      </section>
    </AdminFrame>
  );
}
