import { notFound } from "next/navigation";

import { isScriptId, ScriptDetailScreen } from "@/features/catalog";

export const metadata = { title: "剧本详情 · 十三雾" };

export default async function ScriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isScriptId(id)) notFound();

  return <ScriptDetailScreen id={id} />;
}
