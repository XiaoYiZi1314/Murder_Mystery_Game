import { notFound } from "next/navigation";

import { CostumeDetailScreen, isCostumeId } from "@/features/catalog";

export const metadata = { title: "妆造详情 · 十三雾" };

export default async function CostumeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isCostumeId(id)) notFound();

  return <CostumeDetailScreen id={id} />;
}
