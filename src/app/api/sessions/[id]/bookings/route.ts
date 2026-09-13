import type { NextRequest } from "next/server";
import { bookingCommand } from "@/server/sessions/http";
export const dynamic = "force-dynamic";
import { joinSession } from "@/server/bookings/service";
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return bookingCommand(
    req,
    "booking.join:" + id,
    (c, b) => joinSession(c, id, b),
    201,
  );
}
