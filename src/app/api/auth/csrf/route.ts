import type { NextRequest } from "next/server";
import { ensureCsrfToken } from "@/server/auth/session";
import { unauthenticated } from "@/server/http/errors";
import { withCommand } from "@/server/http/with-command";

export const dynamic = "force-dynamic";

/** GET /api/auth/csrf：仅已登录可取（匿名 401，D-CSRF），返回与会话绑定的令牌。 */
export async function GET(req: NextRequest) {
  return withCommand(req, { auth: "required", csrf: false }, async ({ session, token }) => {
    if (!session || !token) throw unauthenticated();
    const csrfToken = await ensureCsrfToken(token, session);
    return { data: { csrf_token: csrfToken } };
  });
}
