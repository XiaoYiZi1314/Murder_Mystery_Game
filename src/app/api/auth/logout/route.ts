import type { NextRequest } from "next/server";
import { buildSessionCookie, revokeSession } from "@/server/auth/session";
import { unauthenticated } from "@/server/http/errors";
import { withCommand } from "@/server/http/with-command";

export const dynamic = "force-dynamic";

/** POST /api/auth/logout：撤销当前会话并清 Cookie（需 CSRF）。 */
export async function POST(req: NextRequest) {
  return withCommand(req, { auth: "required", parseBody: false }, async ({ token }) => {
    if (!token) throw unauthenticated();
    await revokeSession(token);
    return { message: "已退出登录", data: { signed_out: true }, headers: { "Set-Cookie": buildSessionCookie(null) } };
  });
}
