import { AdminOps, type OpsTab } from "@/features/admin/admin-ops";

export default async function AdminOpsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const valid = (["requests", "registrations", "governance", "assets"] as const).includes(tab as OpsTab);
  return <AdminOps initialTab={valid ? tab as OpsTab : "requests"} />;
}
