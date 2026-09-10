import { notFound } from "next/navigation";

import { DmDetailScreen, isDmId } from "@/features/catalog";

export const metadata = { title: "DM 主页 · 十三雾" };

export default async function DmDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isDmId(id)) notFound();

  return <DmDetailScreen id={id} />;
}
