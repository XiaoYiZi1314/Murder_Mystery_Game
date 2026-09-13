import { AdminSessions } from "@/features/admin/admin-sessions";
import { requirePageActor } from "@/server/auth/page-actor";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requirePageActor("/admin/sessions", ["dm", "manager", "boss"]);
  void searchParams;
  return <AdminSessions />;
}
