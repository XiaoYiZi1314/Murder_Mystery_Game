import type { NextRequest } from "next/server";
import { withCommand } from "@/server/http/with-command";
export const dynamic = "force-dynamic";
import { prisma } from "@/server/db/prisma";
import { readNotifications } from "@/server/notifications/service";
export async function POST(req: NextRequest) {
  return withCommand(req, { auth: "required" }, async (c) => ({
    data: await prisma.$transaction((tx) =>
      readNotifications(c.actor!, c.body.ids, tx),
    ),
  }));
}
