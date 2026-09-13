import { csrfError, originRejected } from "./errors";
import type { SessionData } from "../auth/session";

/** 同源校验：Origin 必须存在且 host 与请求 Host 一致；Sec-Fetch-Site 为 cross-site 直接拒绝。 */
export function assertTrustedOrigin(req: Request): void {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite.toLowerCase() === "cross-site") throw originRejected();
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) throw originRejected();
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw originRejected();
  }
  if (originHost !== host) throw originRejected();
}

export function assertJsonContentType(req: Request): void {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) throw originRejected();
}

/** 已登录写请求：Origin + 会话绑定 X-CSRF-Token 双校验。 */
export function assertCsrfToken(req: Request, session: SessionData): void {
  assertTrustedOrigin(req);
  const token = req.headers.get("x-csrf-token");
  if (!token || token !== session.csrfToken) throw csrfError();
}
