"use client";
import { NotificationBell } from "@/features/notifications/notification-bell";

import type { ReactNode } from "react";
import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/layout";
import { Button } from "@/components/ui";

export function CatalogFooter({ meta }: { meta: ReactNode }) {
  return (
    <SiteFooter>
      <span>十三雾 · 把今晚留给一个故事</span>
      <span className="meta">{meta}</span>
    </SiteFooter>
  );
}

export function ScriptsHeader() {
  return (
    <SiteHeader active="scripts" mode="customer">
      <Link
        href="/"
        className="nav-icon"
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
      <NotificationBell />
      <Button variant="primary" href="/booking/new">
        发起预约
      </Button>
    </SiteHeader>
  );
}

export function DmsHeader() {
  return (
    <SiteHeader active="dms" mode="customer">
      <Button variant="primary" href="/booking/new" data-od-id="nav-booking">
        发起预约
      </Button>
    </SiteHeader>
  );
}

export function CostumesHeader({ detail = false }: { detail?: boolean }) {
  return (
    <SiteHeader active="costumes" mode="customer">
      <Button
        variant="primary"
        href={detail ? "/booking/new" : "/gifts"}
        data-od-id={detail ? "nav-booking" : "nav-gifts"}
      >
        {detail ? "发起预约" : "积分礼品"}
      </Button>
    </SiteHeader>
  );
}
