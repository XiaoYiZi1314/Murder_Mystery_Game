import { BookingPage } from "@/features/booking/booking-page";
import { requirePageActor } from "@/server/auth/page-actor";
import { prisma } from "@/server/db/prisma";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const actor = await requirePageActor(
    "/booking/new" +
      (p.script_id ? "?script_id=" + encodeURIComponent(p.script_id) : ""),
  );
  const [scripts, user] = await Promise.all([
    prisma.script.findMany({
      where: { status: "on" },
      select: { id: true, title: true, minPlayers: true, maxPlayers: true },
      orderBy: { id: "asc" },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: BigInt(actor.userId) },
      select: { nickname: true, phone: true },
    }),
  ]);
  return (
    <BookingPage
      scripts={scripts.map((s) => ({
        id: s.id.toString(),
        title: s.title,
        player_min: s.minPlayers,
        player_max: s.maxPlayers,
      }))}
      contact={{ name: user.nickname, phone: user.phone }}
      selectedId={p.script_id}
    />
  );
}
