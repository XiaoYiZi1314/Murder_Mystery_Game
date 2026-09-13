"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Dialog } from "@/components/ui";
import { ApiClientError, apiFetch, getCsrfToken } from "@/lib/api/client";
import { useRemote } from "@/features/booking/api-state";
import { businessTime } from "@/lib/booking-time";
import "@/features/booking/booking.css";
import type { NotificationListDto as Notices } from "@/lib/api/contracts";
export function NotificationBell({
  className = "nav-icon",
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false),
    [page, setPage] = useState(1),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const q = useRemote<Notices>(
    `/api/notifications?page=${page}`,
    undefined,
    20000,
  );
  async function mark(id: string) {
    setSaving(true);
    setError("");
    try {
      await apiFetch("/api/notifications/read", {
        method: "POST",
        body: { ids: [id] },
        csrf: await getCsrfToken(true),
      });
      await q.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新失败");
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={`查看通知${q.data?.unread_count ? `，${q.data.unread_count} 条未读` : ""}`}
        onClick={() => {
          setOpen(true);
          void q.reload();
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {!!q.data?.unread_count && <span className="dot" />}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`站内通知 · ${q.data?.unread_count ?? 0} 条未读`}
      >
        {q.loading && <p role="status">加载中…</p>}
        {q.error &&
          (q.error instanceof ApiClientError && q.error.status === 401 ? (
            <Link href="/login?next=%2Fme%2Fbooking">登录后查看通知</Link>
          ) : (
            <p role="alert">
              加载失败 <Button onClick={() => void q.reload()}>重试</Button>
            </p>
          ))}
        {error && <p role="alert">{error}</p>}
        <div className="c3-notifications">
          {q.data?.items.map((n) => (
            <article key={n.id} className={!n.read_at ? "unread" : ""}>
              <h3>{n.title}</h3>
              <p>{n.body}</p>
              <small>{businessTime(n.created_at)}</small>
              <div className="c3-actions">
                {n.href && (
                  <Link
                    href={n.href}
                    onClick={() => {
                      void mark(n.id);
                      setOpen(false);
                    }}
                  >
                    查看详情 →
                  </Link>
                )}
                {!n.read_at && (
                  <Button
                    disabled={saving}
                    variant="secondary"
                    onClick={() => void mark(n.id)}
                  >
                    标为已读
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
        {q.data && !q.data.items.length && <p>暂无通知。</p>}
        <div className="c3-pagination">
          <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            上一页
          </Button>
          <span>{page}</span>
          <Button
            disabled={page >= (q.data?.page_info.total_pages ?? 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </Button>
        </div>
      </Dialog>
    </>
  );
}
