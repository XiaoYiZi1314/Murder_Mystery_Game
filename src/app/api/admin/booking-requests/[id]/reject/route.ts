import type { NextRequest } from "next/server";
import { bookingCommand } from "@/server/sessions/http";
export const dynamic = "force-dynamic";
import { reviewRequest } from "@/server/booking-requests/service";
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return bookingCommand(req, "booking_request.reject:" + id, (c, b) =>
    reviewRequest(c, id, "rejected", b),
  );
}
