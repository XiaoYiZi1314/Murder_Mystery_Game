import { listScripts, listDms } from "./queries";
import { listSessions } from "../sessions/queries";
import { publicSettings } from "../settings/service";
export async function homeContent() {
  const q = { q: "", sort: "latest" as const, page: 1, pageSize: 6 };
  const [scripts, dms, settings, sessions] = await Promise.all([
    listScripts({ ...q, featured: true }, null),
    listDms(q, false),
    publicSettings(),
    listSessions(new URLSearchParams({ page_size: "4" })),
  ]);
  return {
    sessions: sessions.items,
    scripts: scripts.items,
    dms: dms.items,
    wechat_qrcode: settings.wechat_qrcode,
  };
}
