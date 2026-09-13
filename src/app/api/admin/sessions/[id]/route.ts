import type { NextRequest } from "next/server";
import { bookingCommand } from "@/server/sessions/http";
export const dynamic = "force-dynamic";
import { updateSession } from "@/server/sessions/service";
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return bookingCommand(req, "session.update:" + id, (c, b) =>
    updateSession(c, id, b),
  );
}
import { withCommand } from "@/server/http/with-command";
import { assertPermission } from "@/server/auth/permissions";
import { prisma } from "@/server/db/prisma";
import { id as parseId } from "@/server/sessions/validation";
import { sessionDto, sessionInclude } from "@/server/sessions/dto";
import { notFound } from "@/server/http/errors";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withCommand(req, { auth: "required" }, async (c) => {
    assertPermission(c.actor, "sessions.manage");
    const s = await prisma.session.findUnique({
      where: { id: parseId(id) },
      include: sessionInclude,
    });
    if (!s) throw notFound();
    return { data: sessionDto(s) };
  });
}
