import { MyBookingsPage } from "@/features/booking/my-bookings";
import { requirePageActor } from "@/server/auth/page-actor";
export const dynamic = "force-dynamic";
export default async function Page() {
  await requirePageActor("/me/booking");
  return <MyBookingsPage />;
}
