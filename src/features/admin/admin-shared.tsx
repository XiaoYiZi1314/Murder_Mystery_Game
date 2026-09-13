"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Button, useToast } from "@/components/ui";
import { Screen, SiteFooter, SiteHeader } from "@/components/layout";

export type AdminSection = "dashboard" | "sessions" | "finance" | "content" | "ops" | "staff";

export function AdminFrame({
  screen,
  active,
  children,
  opsFooter = false,
}: {
  screen: string;
  active: AdminSection;
  children: ReactNode;
  opsFooter?: boolean;
}) {
  const toast = useToast();

  return (
    <Screen name={screen}>
      <SiteHeader mode="admin" active={active}>
        {opsFooter ? (
          <>
            <Button href="/" variant="secondary" data-od-id="nav-home">回到 C 端</Button>
            <span className="tag">店长</span>
          </>
        ) : (
          <>
            <Link className="nav-icon" href="/" aria-label="返回首页" title="返回首页" data-od-id="home-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M3 11.5 12 4l9 7.5" />
                <path d="M5.5 10v9h13v-9M9.5 19v-5h5v5" />
              </svg>
            </Link>
            <span className="tag">店长</span>
            <button className="nav-icon" type="button" onClick={() => toast("已是最新状态")} aria-label="查看后台通知">
              <span className="dot" />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
              </svg>
            </button>
          </>
        )}
      </SiteHeader>
      <main id="content">{children}</main>
      <SiteFooter>
        <span>{opsFooter ? "十三雾 · 商家工作台" : "十三雾 · 把今晚留给一个故事"}</span>
        <span className="meta">{opsFooter ? "高风险操作需要真实后端审计 · 杭州" : "单店自用 PWA · 杭州"}</span>
      </SiteFooter>
    </Screen>
  );
}

export function PageHead({
  eyebrow,
  title,
  lead,
  children,
  odId = "admin-head",
}: {
  eyebrow: string;
  title: string;
  lead: string;
  children?: ReactNode;
  odId?: string;
}) {
  return (
    <section className="page-head" data-od-id={odId}>
      <div className="container">
        <p className="eyebrow">{eyebrow}</p>
        <div className="row-between">
          <div>
            <h1 data-od-id="page-title">{title}</h1>
            <p className="lead">{lead}</p>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

export function MetricGrid({
  items,
  className = "container grid-4",
}: {
  items: Array<{ value: ReactNode; label: string }>;
  className?: string;
}) {
  return (
    <div className={className}>
      {items.map((item) => (
        <div className="metric" key={item.label}>
          <div className="value num">{item.value}</div>
          <div className="label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

export function StatusBadge({
  tone = "default",
  children,
  ...props
}: {
  tone?: "default" | "open" | "pending" | "locked" | "danger";
  children: ReactNode;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`status${tone === "default" ? "" : ` ${tone}`}`} {...props}>
      {children}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className = "segmented",
}: {
  value: T;
  options: Array<{ value: T; label: ReactNode }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={className} role="tablist">
      {options.map((option) => (
        <button
          className={value === option.value ? "active" : undefined}
          key={option.value}
          onClick={() => onChange(option.value)}
          role="tab"
          aria-selected={value === option.value}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function DemoNotice({ children }: { children?: ReactNode }) {
  return (
    <div className="notice admin-demo-notice">
      {children ?? "当前为前端演示数据；操作仅在本页面生效，不会保存至真实数据库。"}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export function ActionButton({ message, onAction, children }: { message: string; onAction: (message: string) => void; children: ReactNode }) {
  return (
    <Button variant="ghost" onClick={() => onAction(message)}>
      {children}
    </Button>
  );
}
