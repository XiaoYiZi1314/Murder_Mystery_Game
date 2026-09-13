"use client";
import Link from "next/link";
import { Button } from "@/components/ui";
import { businessTime } from "@/lib/booking-time";
import { stateLabels, type SessionDto } from "./types";
import "./booking.css";
export function SessionCard({
  session: s,
  onJoin,
  variant = "card",
}: {
  session: SessionDto;
  onJoin?: (s: SessionDto) => void;
  variant?: "card" | "row";
}) {
  if (variant === "row")
    return (
      <article className="session-card data-row">
        <div className="main">
          <strong>
            <Link href={`/scripts/${s.script.slug}`}>{s.script.title}</Link>
          </strong>
          <span>
            {businessTime(s.start_time)} · 主 DM：
            {s.primary_dm_name ?? "待确认"}
          </span>
        </div>
        <div>
          <span className="meta">每人价格</span>
          <strong>¥{s.price}</strong>
        </div>
        <div>
          <span
            className={`status ${s.status === "open" ? "open" : "pending"}`}
          >
            {stateLabels[s.status]}
          </span>
          <p className="meta">
            已报 {s.booked_count} / 上限 {s.player_max}，剩余{" "}
            {s.remaining_count} 位
          </p>
          <span className="meta">还差 {s.needed_count} 人达最低人数</span>
        </div>
        <div>
          <Button
            disabled={s.status !== "open" || !s.remaining_count}
            variant="secondary"
            onClick={() => onJoin?.(s)}
          >
            团队报名
          </Button>
        </div>
      </article>
    );
  return (
    <article className="session-card c3-card">
      <div className="row-between">
        <h3>{s.script.title}</h3>
        <span className="tag">{stateLabels[s.status]}</span>
      </div>
      <p>{businessTime(s.start_time)} · 北京时间</p>
      <p>
        主 DM：{s.primary_dm_name ?? "待确认"} · ¥{s.price} / 人
      </p>
      <p>
        已报 {s.booked_count} / 上限 {s.player_max}，还差 {s.needed_count}{" "}
        人达到最低人数
      </p>
      <p className="meta">
        剩余 {s.remaining_count} 位；最低 {s.player_min} 人，满员不等于锁车。
      </p>
      <div className="c3-progress" aria-hidden="true">
        <span
          style={{
            width: `${Math.min(100, (s.booked_count / s.player_max) * 100)}%`,
          }}
        />
      </div>
      <div className="c3-actions">
        <Link href={`/scripts/${s.script.slug}`}>剧本详情</Link>
        {onJoin ? (
          <Button
            disabled={s.status !== "open" || !s.remaining_count}
            onClick={() => onJoin(s)}
          >
            团队报名
          </Button>
        ) : (
          <Button href={`/sessions?script_id=${s.script_id}`}>查看场次</Button>
        )}
      </div>
    </article>
  );
}
