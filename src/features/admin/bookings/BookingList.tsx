"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Input, Select, Table, Pagination } from "antd";
import { apiFetch } from "@/lib/api/client";
import { businessTime } from "@/lib/booking-time";
import type { PageResult } from "@/features/booking/api-state";
import { stateLabels, type BookingDto } from "@/features/booking/types";
import { AdminFrame, PageHead } from "../admin-shared";
import "../content/content.css";
export function BookingList({ sessionId = "" }: { sessionId?: string }) {
  const [page, setPage] = useState(1),
    [sid, setSid] = useState(sessionId),
    [status, setStatus] = useState("");
  const q = useQuery({
    queryKey: ["admin-bookings", sid, status, page],
    queryFn: () =>
      apiFetch<PageResult<BookingDto>>(
        `/api/admin/bookings?session_id=${encodeURIComponent(sid)}&status=${status}&page=${page}`,
      ),
  });
  return (
    <AdminFrame screen="admin-sessions" active="sessions">
      <PageHead
        eyebrow="B 端 / 报名名单"
        title="每一份报名，都有真实记录。"
        lead="仅员工可查看联系人。C3 只读名单；押金、锁车和跳车操作由 C4 接入。"
      />
      <section className="section">
        <div className="container">
          <Link href="/admin/sessions">返回排期</Link>
          <div className="content-nav">
            <Input.Search
              aria-label="按场次 ID 筛选"
              placeholder="场次 ID"
              defaultValue={sid}
              onSearch={(v) => {
                setSid(v);
                setPage(1);
              }}
            />
            <Select
              aria-label="报名状态筛选"
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={[
                { label: "全部状态", value: "" },
                ...["joined", "locked", "finished", "cancelled", "jumped"].map(
                  (s) => ({ value: s, label: stateLabels[s] }),
                ),
              ]}
            />
          </div>
          {q.error && (
            <Alert
              type="error"
              title={q.error.message}
              action={<Button onClick={() => void q.refetch()}>重试</Button>}
            />
          )}
          <div className="table-wrap">
            <Table
              rowKey="id"
              loading={q.isPending}
              pagination={false}
              dataSource={q.data?.items ?? []}
              scroll={{ x: 800 }}
              columns={[
                { title: "报名 ID", dataIndex: "id" },
                {
                  title: "剧本 / 时间",
                  render: (_, b: BookingDto) =>
                    `${b.session.script.title} / ${businessTime(b.session.start_time)}`,
                },
                { title: "人数", dataIndex: "player_count" },
                {
                  title: "联系人",
                  render: (_, b: BookingDto) => b.contact.name,
                },
                {
                  title: "手机号",
                  render: (_, b: BookingDto) => b.contact.phone,
                },
                { title: "总价", dataIndex: "total_amount" },
                {
                  title: "状态",
                  render: (_, b: BookingDto) => stateLabels[b.status],
                },
              ]}
            />
          </div>
          <Pagination
            current={page}
            pageSize={12}
            total={q.data?.page_info.total ?? 0}
            showSizeChanger={false}
            onChange={setPage}
          />
        </div>
      </section>
    </AdminFrame>
  );
}
