import type { NextRequest } from "next/server";
import { withCommand } from "@/server/http/with-command";
export const dynamic = "force-dynamic";
import { listBookings } from "@/server/sessions/queries";
export async function GET(req: NextRequest) {
  return withCommand(req, { auth: "required" }, async (c) => ({
    data: await listBookings(c.actor!, req.nextUrl.searchParams, false),
  }));
}
