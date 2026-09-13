import type { NextRequest } from "next/server";
import { withCommand } from "@/server/http/with-command";
export const dynamic = "force-dynamic";
import { listSessions } from "@/server/sessions/queries";
export async function GET(req: NextRequest) {
  return withCommand(req, { auth: "optional" }, async () => ({
    data: await listSessions(req.nextUrl.searchParams),
  }));
}
