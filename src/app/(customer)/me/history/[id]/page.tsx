import { notFound } from "next/navigation";
import { HistoryDetailPage } from "@/features/member/HistoryDetailPage";
import { playedScripts, type PlayedScript } from "@/features/member/data";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!Object.hasOwn(playedScripts, id)) notFound();
  return <HistoryDetailPage script={playedScripts[id as PlayedScript["id"]]} />;
}
