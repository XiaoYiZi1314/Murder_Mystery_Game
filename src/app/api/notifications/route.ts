import type { NextRequest } from "next/server";
import { withCommand } from "@/server/http/with-command";
export const dynamic = "force-dynamic";
import { listNotifications } from "@/server/notifications/service";
export async function GET(req: NextRequest) {
  return withCommand(req, { auth: "required" }, async (c) => ({
    data: await listNotifications(c.actor!, req.nextUrl.searchParams),
  }));
}
