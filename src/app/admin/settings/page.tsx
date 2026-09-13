import { SettingsEditor } from "@/features/admin/content/settings-editor";
import { requirePageActor } from "@/server/auth/page-actor";
export default async function Page(){await requirePageActor("/admin/settings",["manager","boss"]);return <SettingsEditor/>;}
