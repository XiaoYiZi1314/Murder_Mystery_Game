"use client";
import { NotificationBell } from "@/features/notifications/notification-bell";

import Link from "next/link";
import { Button } from "@/components/ui";
import { SiteHeader } from "@/components/layout";

export function CustomerHeader({ active }: { active: "sessions" | "booking" }) {
  return (
    <SiteHeader
      mode="customer"
      active={active === "booking" ? "sessions" : active}
    >
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
      <NotificationBell />
      <Button href="/booking/new">发起预约</Button>
    </SiteHeader>
  );
}
