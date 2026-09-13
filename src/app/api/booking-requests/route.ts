import type { NextRequest } from "next/server";
import { bookingCommand } from "@/server/sessions/http";
export const dynamic = "force-dynamic";
import { submitRequest } from "@/server/booking-requests/service";
export async function POST(req: NextRequest) {
  return bookingCommand(req, "booking_request.submit", submitRequest, 201);
}
