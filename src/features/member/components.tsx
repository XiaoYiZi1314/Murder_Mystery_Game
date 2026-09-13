"use client";
import { NotificationBell } from "@/features/notifications/notification-bell";

import { useRemote } from "@/features/booking/api-state";
import type { MeDto } from "@/lib/api/contracts";
import { Badge, Button } from "@/components/ui";
import Link from "next/link";
import type { LedgerEntry, LedgerKind, MemberReview } from "./data";

export function MemberHeaderActions({
  notifications = true,
}: {
  notifications?: boolean;
}) {
  return (
    <>
      <Link
        className="nav-icon"
        href="/"
        aria-label="返回首页"
        title="返回首页"
        data-od-id="home-link"
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
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10v9h13v-9M9.5 19v-5h5v5" />
        </svg>
      </Link>
      {notifications ? <NotificationBell /> : null}
      <Button variant="primary" href="/booking/new" data-od-id="booking-link">
        发起预约
      </Button>
    </>
  );
}

export function MemberBadge({
  children = "望遥会员",
}: {
  children?: React.ReactNode;
}) {
  return <Badge className="tag">{children}</Badge>;
}

export function EmptyState({
  title,
  children,
  id,
  visible = true,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
  visible?: boolean;
}) {
  return (
    <div
      className={`empty${visible ? " is-visible" : ""}`}
      id={id}
      aria-hidden={!visible}
      role="status"
    >
      <strong>{title}</strong>
      <span>{children}</span>
    </div>
  );
}

export function WalletLedger({
  entries,
  compact = false,
  filter = "all",
}: {
  entries: LedgerEntry[];
  compact?: boolean;
  filter?: "all" | LedgerKind;
}) {
  if (compact) {
    return (
      <div className="data-list">
        {entries.map((entry) => (
          <div className="data-row" key={entry.id}>
            <div className="main">
              <strong>{entry.subject}</strong>
              <span>
                {entry.summaryDetail} · {entry.date}
              </span>
            </div>
            <div className="num">{entry.amount}</div>
            <div className="num">
              {entry.points === "—" ? "余额 ¥680.00" : `积分 ${entry.points}`}
            </div>
            <Badge className="tag">{entry.label}</Badge>
          </div>
        ))}
      </div>
    );
  }

  return (
    <table data-od-id="ledger-table">
      <caption className="sr-only">林间有雾的储值与积分流水明细</caption>
      <thead>
        <tr>
          <th className="date" scope="col">
            日期
          </th>
          <th className="type" scope="col">
            类型
          </th>
          <th className="subject" scope="col">
            事项
          </th>
          <th className="source" scope="col">
            支付 / 来源
          </th>
          <th className="amount" scope="col">
            余额变动
          </th>
          <th className="points" scope="col">
            积分变动
          </th>
        </tr>
      </thead>
      <tbody id="ledger-body">
        {entries.map((entry) => (
          <tr
            key={entry.id}
            hidden={filter !== "all" && !entry.kinds.includes(filter)}
            data-ledger-type={entry.kinds.join(" ")}
            data-od-id={`ledger-row-${entry.id}`}
          >
            <td className="date num" data-label="日期">
              {entry.date}
            </td>
            <td className="type" data-label="类型">
              <Badge className="tag">{entry.label}</Badge>
            </td>
            <td className="subject" data-label="事项">
              <strong>{entry.subject}</strong>
              <span>{entry.detail}</span>
            </td>
            <td className="source" data-label="支付 / 来源">
              {entry.source}
            </td>
            <td className="amount num" data-label="余额变动">
              {entry.amount}
            </td>
            <td className="points num" data-label="积分变动">
              {entry.points}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ReviewCard({
  review,
  onDelete,
  hidden = false,
}: {
  review: MemberReview;
  onDelete: (id: string) => void;
  hidden?: boolean;
}) {
  return (
    <article className="review" data-review-kind={review.kind} hidden={hidden}>
      <div className="review-mark">{review.mark}</div>
      <div>
        <div className="review-head">
          <strong>{review.subject}</strong>
          <Badge className="tag">
            {review.kind === "script" ? "剧本" : "DM"}
          </Badge>
          <span className="rating">★★★★★ 5.0</span>
        </div>
        <p className="review-text">{review.text}</p>
        <p className="review-time">{review.date}</p>
        {review.reply ? (
          <div className="review-reply">{review.reply}</div>
        ) : null}
      </div>
      <div className="review-actions">
        <Button
          variant="danger"
          type="button"
          onClick={() => onDelete(review.id)}
        >
          删除
        </Button>
      </div>
    </article>
  );
}

export const ledgerFilters: { value: "all" | LedgerKind; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "topup", label: "充值" },
  { value: "spend", label: "消费" },
  { value: "points", label: "积分" },
  { value: "deposit", label: "押金" },
  { value: "gift", label: "兑换" },
];

export function AccountRoleBadge() {
  const account = useRemote<MeDto>("/api/me");
  const labels = { customer: "顾客", dm: "DM", manager: "店长", boss: "BOSS" };
  return <span className="tag">{account.data ? labels[account.data.role] : account.error ? "身份不可用" : "身份加载中"}</span>;
}
