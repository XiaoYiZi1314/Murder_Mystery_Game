import { ContentManager } from "@/features/admin/content/content-manager";
import { requirePageActor } from "@/server/auth/page-actor";
export default async function Page(){await requirePageActor("/admin/costumes",["manager","boss"]);return <ContentManager kind="costumes"/>;}
