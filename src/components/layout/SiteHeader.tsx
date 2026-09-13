/* Original local logo markup preserves the supplied intrinsic sizing and CSS. */
/* eslint-disable @next/next/no-img-element */
"use client";
import { AccountRoleBadge } from "@/features/member/components";
import { NotificationBell } from "@/features/notifications/notification-bell";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui";

type NavItem = { key: string; href: string; label: string; odId?: string };
type HeaderProps = {
  active?: string;
  mode?: "customer" | "home" | "landing" | "auth" | "admin";
  children?: ReactNode;
  onBooking?: () => void;
  navItems?: NavItem[];
};
const customerItems: NavItem[] = [
  { key: "scripts", href: "/scripts", label: "剧本" },
  { key: "sessions", href: "/sessions", label: "拼车大厅" },
  { key: "dms", href: "/dms", label: "DM" },
  { key: "costumes", href: "/costumes", label: "妆造" },
  { key: "me", href: "/me", label: "我的" },
];
const adminItems: NavItem[] = [
  { key: "dashboard", href: "/admin", label: "工作台" },
  { key: "sessions", href: "/admin/sessions", label: "场次" },
  { key: "finance", href: "/admin/finance", label: "财务" },
  { key: "content", href: "/admin/content", label: "内容" },
  { key: "ops", href: "/admin/ops", label: "运营处理" },
  { key: "staff", href: "/admin/staff", label: "员工" },
];

export function SiteHeader({
  active,
  mode = "customer",
  children,
  onBooking,
  navItems,
}: HeaderProps) {
  const isHome = mode === "home" || mode === "landing";
  const isAdmin = mode === "admin";
  const items =
    navItems ??
    (isAdmin
      ? adminItems
      : mode === "landing"
        ? [
            { key: "scripts", href: "/scripts", label: "剧本" },
            { key: "sessions", href: "/sessions", label: "拼车大厅" },
            { key: "about", href: "#experience", label: "关于十三雾" },
          ]
        : mode === "auth"
          ? customerItems.slice(0, 3)
          : customerItems);
  return (
    <header className="topnav" data-od-id="topnav">
      <div className="container topnav-inner">
        <Link
          className="brand"
          href={isAdmin ? "/admin" : isHome ? "#top" : "/"}
          data-od-id="brand-link"
          aria-label="返回十三雾首页"
        >
          <img
            src="/assets/shisanwu-logo.jpg"
            alt={isHome ? "十三雾品牌标志" : "十三雾标志"}
          />
          <span>
            十三雾
            {!isHome && <small>{isAdmin ? "商家工作台" : "剧本杀体验"}</small>}
          </span>
        </Link>
        <nav aria-label={isAdmin ? "后台主导航" : "主导航"}>
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              data-od-id={item.odId ?? `nav-${item.key}`}
              aria-current={active === item.key ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={isHome ? "nav-tools" : "nav-actions"}>
          {children ??
            (isHome ? (
              <>
                <NotificationBell />
                {onBooking ? (
                  <Button onClick={onBooking} data-od-id="nav-booking">
                    发起预约
                  </Button>
                ) : (
                  <Button href="/booking/new" data-od-id="nav-booking">
                    发起预约
                  </Button>
                )}
              </>
            ) : isAdmin ? (
              <>
                <Button href="/" variant="secondary" data-od-id="nav-home">
                  回到 C 端
                </Button>
                <AccountRoleBadge />
              </>
            ) : mode === "auth" ? (
              <Button href="/" variant="secondary" data-od-id="nav-back">
                返回首页
              </Button>
            ) : (
              <Button href="/booking/new" data-od-id="nav-booking">
                发起预约
              </Button>
            ))}
        </div>
      </div>
    </header>
  );
}
