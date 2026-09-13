import { BookingList } from "@/features/admin/bookings/BookingList";
import { requirePageActor } from "@/server/auth/page-actor";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePageActor("/admin/bookings", ["dm", "manager", "boss"]);
  const p = await searchParams;
  return <BookingList sessionId={p.session_id} />;
}
