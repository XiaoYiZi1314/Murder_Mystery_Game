import type { NextRequest } from "next/server";
import { bookingCommand } from "@/server/sessions/http";
export const dynamic = "force-dynamic";
import { cancelBooking } from "@/server/bookings/service";
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return bookingCommand(
    req,
    "booking.cancel:" + id,
    (c) => cancelBooking(c, id),
    200,
    false,
  );
}
