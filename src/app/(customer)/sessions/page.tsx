import { SessionsPage } from "@/features/booking/sessions-page";
import { listSessions } from "@/server/sessions/queries";
import { prisma } from "@/server/db/prisma";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(p))
    if (typeof v === "string") q.set(k, v);
  const scripts = await prisma.script.findMany({
    where: { status: "on" },
    select: { id: true, title: true },
    orderBy: { id: "asc" },
  });
  return (
    <SessionsPage
      scripts={scripts.map((s) => ({ id: s.id.toString(), title: s.title }))}
      initial={await listSessions(q)}
      query={q.toString()}
    />
  );
}
