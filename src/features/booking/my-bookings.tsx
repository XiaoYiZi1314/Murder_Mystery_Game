"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Dialog, Select } from "@/components/ui";
import { Screen, SiteHeader, SiteFooter } from "@/components/layout";
import { MemberHeaderActions } from "@/features/member/components";
import { businessTime } from "@/lib/booking-time";
import { useRemote, useBookingCommand, type PageResult } from "./api-state";
import { stateLabels, type BookingDto, type BookingRequestDto } from "./types";
import "./booking.css";
export function MyBookingLists() {
  const [page, setPage] = useState(1),
    [requestPage, setRequestPage] = useState(1),
    [status, setStatus] = useState(""),
    [selected, setSelected] = useState<BookingDto | null>(null);
  const bookings = useRemote<PageResult<BookingDto>>(
      `/api/me/bookings?page=${page}&status=${status}`,
    ),
    requests = useRemote<PageResult<BookingRequestDto>>(
      `/api/me/booking-requests?page=${requestPage}`,
    ),
    command = useBookingCommand();
  async function cancel() {
    if (!selected) return;
    try {
      await command.run(`/api/bookings/${selected.id}`, "DELETE");
      setSelected(null);
      await bookings.reload();
    } catch {}
  }
  return (
    <div className="c3-stack">
      <div className="c3-actions">
        <Link href="/sessions">去拼车大厅</Link>
        <Link href="/booking/new">提交自主预约</Link>
        <Button
          variant="secondary"
          onClick={() => {
            void bookings.reload();
            void requests.reload();
          }}
        >
          刷新预约
        </Button>
      </div>
      <h2>我的报名</h2>
      <Select
        value={status}
        aria-label="报名状态"
        onChange={(e) => {
          setStatus(e.target.value);
          setPage(1);
        }}
      >
        <option value="">全部报名状态</option>
        {["joined", "locked", "finished", "cancelled", "jumped"].map((s) => (
          <option key={s} value={s}>
            {stateLabels[s]}
          </option>
        ))}
      </Select>
      {bookings.loading && <p role="status">加载报名中…</p>}
      {bookings.error && <p role="alert">{bookings.error.message}</p>}
      {bookings.data?.items.map((b) => (
        <article className="c3-card" key={b.id}>
          <h3>
            {b.session.script.title} · {stateLabels[b.status]}
          </h3>
          <p>
            {businessTime(b.session.start_time)} · {b.player_count} 人 · ¥
            {b.total_amount}
          </p>
          <p>
            联系人：{b.contact.name} / {b.contact.phone}
          </p>
          {b.status === "joined" &&
            ["open", "full"].includes(b.session.status) && (
              <Button
                variant="secondary"
                onClick={() => {
                  command.clear();
                  setSelected(b);
                }}
              >
                取消报名
              </Button>
            )}
        </article>
      ))}
      {bookings.data && !bookings.data.items.length && (
        <p>暂无报名。自主申请通过后，报名会显示在这里。</p>
      )}
      <div className="c3-pagination">
        <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          上一页报名
        </Button>
        <span>{page}</span>
        <Button
          disabled={page >= (bookings.data?.page_info.total_pages ?? 0)}
          onClick={() => setPage((p) => p + 1)}
        >
          下一页报名
        </Button>
      </div>
      <h2>自主预约申请</h2>
      <p>申请不是第二份报名；获批后的实际占坑及取消状态以上方报名为准。</p>
      {requests.loading && <p role="status">加载申请中…</p>}
      {requests.error && <p role="alert">{requests.error.message}</p>}
      {requests.data?.items.map((r) => (
        <article key={r.id} className="c3-card">
          <h3>
            {r.script_title} · {stateLabels[r.status]}
          </h3>
          <p>
            {businessTime(r.expected_time)} · 申请 {r.player_count} 人
          </p>
          {r.reason && <p>拒绝原因：{r.reason}</p>}
          {r.status === "approved" && <p>已生成报名，请以上方报名状态为准。</p>}
        </article>
      ))}
      {requests.data && !requests.data.items.length && (
        <p>暂无自主预约申请。</p>
      )}
      <div className="c3-pagination">
        <Button
          disabled={requestPage <= 1}
          onClick={() => setRequestPage((p) => p - 1)}
        >
          上一页申请
        </Button>
        <span>{requestPage}</span>
        <Button
          disabled={requestPage >= (requests.data?.page_info.total_pages ?? 0)}
          onClick={() => setRequestPage((p) => p + 1)}
        >
          下一页申请
        </Button>
      </div>
      <Dialog
        open={!!selected}
        onClose={() => !command.pending && setSelected(null)}
        title="确认取消本次团队报名？"
      >
        <p>取消后将释放整个团队的 {selected?.player_count} 个位置。</p>
        {command.error && <p role="alert">{command.error.message}</p>}
        <Button disabled={command.pending} onClick={() => void cancel()}>
          {command.pending ? "取消中…" : "确认取消报名"}
        </Button>
      </Dialog>
    </div>
  );
}
export function MyBookingsPage() {
  return (
    <Screen name="me">
      <SiteHeader active="me">
        <MemberHeaderActions />
      </SiteHeader>
      <main id="content">
        <section className="page-head">
          <div className="container">
            <p className="eyebrow">C 端 / 我的预约</p>
            <h1>下一场故事，安排清楚。</h1>
          </div>
        </section>
        <section className="section">
          <div className="container">
            <MyBookingLists />
          </div>
        </section>
      </main>
      <SiteFooter>
        <span>十三雾 · 把今晚留给一个故事</span>
      </SiteFooter>
    </Screen>
  );
}

export function RecentBookings() {
  const q = useRemote<PageResult<BookingDto>>("/api/me/bookings?page_size=2");
  return (
    <>
      <p className="eyebrow">最近预约</p>
      {q.loading && <p>加载中…</p>}
      {q.error && <p role="alert">预约暂时无法加载</p>}
      {q.data?.items.map((b) => (
        <div key={b.id}>
          <h3>
            {b.session.script.title} · {stateLabels[b.status]}
          </h3>
          <p>
            {businessTime(b.session.start_time)} · {b.player_count} 人
          </p>
        </div>
      ))}
      {q.data && !q.data.items.length && <p>暂无报名。</p>}
      <Link href="/me/booking">查看全部预约 →</Link>
    </>
  );
}
