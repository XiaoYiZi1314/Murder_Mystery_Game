import { AdminDashboard } from "@/features/admin/admin-dashboard";
import { requirePageActor } from "@/server/auth/page-actor";
import { listSessions } from "@/server/sessions/queries";
import { prisma } from "@/server/db/prisma";
import { businessDay } from "@/lib/booking-time";
export const dynamic = "force-dynamic";
export default async function Page() {
  const actor = await requirePageActor("/admin", ["dm", "manager", "boss"]);
  const from = new Date(businessDay() + "T00:00:00+08:00"),
    to = new Date(from.getTime() + 86400000);
  const [sessions, pending] = await Promise.all([
    listSessions(
      new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
        page_size: "50",
      }),
      actor,
    ),
    prisma.bookingRequest.count({ where: { status: "pending" } }),
  ]);
  return (
    <AdminDashboard
      sessions={sessions.items}
      todayTotal={sessions.page_info.total}
      pending={pending}
    />
  );
}
