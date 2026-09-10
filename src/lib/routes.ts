/** Source names remain mapped here so old bookmarks never leak .html into app navigation. */
export const sourceRoutes: Record<string, string> = {
  "index.html": "/",
  "shisanwu-landing.html": "/shisanwu-landing",
  "scripts.html": "/scripts",
  "script-detail.html": "/scripts/wugang-laixin",
  "dms.html": "/dms",
  "dm-detail.html": "/dms/linshen",
  "costumes.html": "/costumes",
  "costume-detail.html": "/costumes/wugang-old",
  "sessions.html": "/sessions",
  "booking.html": "/booking/new",
  "me.html": "/me",
  "wallet-detail.html": "/me/wallet",
  "played-script-detail.html": "/me/history/wugang-laixin",
  "me-reviews.html": "/me/reviews",
  "login.html": "/login",
  "gifts.html": "/gifts",
  "report.html": "/report",
  "admin.html": "/admin",
  "admin-sessions.html": "/admin/sessions",
  "admin-finance.html": "/admin/finance",
  "admin-content.html": "/admin/content",
  "admin-ops.html": "/admin/ops",
  "prototype-map.html": "/dev/prototype-map",
};

export function sourceHref(href: string): string {
  if (href.startsWith("#") || /^(https?:|mailto:|tel:)/.test(href)) return href;
  const parsed = new URL(href, "https://reference.local");
  const file = parsed.pathname.replace(/^\//, "");
  let target = sourceRoutes[file] ?? parsed.pathname;
  const detail =
    file === "dm-detail.html"
      ? ["dm", "/dms/"]
      : file === "costume-detail.html"
        ? ["costume", "/costumes/"]
        : file === "script-detail.html"
          ? ["script", "/scripts/"]
          : null;
  if (detail && parsed.searchParams.has(detail[0])) {
    target =
      detail[1] + encodeURIComponent(parsed.searchParams.get(detail[0])!);
    parsed.searchParams.delete(detail[0]);
  }
  const query = parsed.searchParams.toString();
  return target + (query ? `?${query}` : "") + parsed.hash;
}
