import type { NextRequest } from "next/server";
import { withCommand } from "@/server/http/with-command";
export const dynamic = "force-dynamic";
import { listSessions } from "@/server/sessions/queries";
import { createSession } from "@/server/sessions/service";
import { bookingCommand } from "@/server/sessions/http";
export async function GET(req: NextRequest) {
  return withCommand(req, { auth: "required" }, async (c) => ({
    data: await listSessions(req.nextUrl.searchParams, c.actor!),
  }));
}
export async function POST(req: NextRequest) {
  return bookingCommand(req, "session.create", createSession, 201);
}
