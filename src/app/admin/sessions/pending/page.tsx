import { BookingRequests } from "@/features/admin/booking-requests";
import { requirePageActor } from "@/server/auth/page-actor";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePageActor("/admin/sessions/pending", ["dm", "manager", "boss"]);
  void searchParams;
  return <BookingRequests />;
}
