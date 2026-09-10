import assert from "node:assert/strict";

const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const production = process.argv.includes("--production");
const routes = [
  "/",
  "/shisanwu-landing",
  "/scripts",
  "/scripts/wugang-laixin",
  "/scripts/changyexing",
  "/scripts/jinling",
  "/dms",
  "/dms/linshen",
  "/dms/adu",
  "/dms/shisan",
  "/costumes",
  "/costumes/wugang-old",
  "/costumes/letter-room",
  "/costumes/chang-an",
  "/sessions",
  "/booking/new",
  "/me",
  "/me/booking",
  "/me/member",
  "/me/history",
  "/me/history/wugang-laixin",
  "/me/reviews",
  "/me/wallet",
  "/login",
  "/register",
  "/report",
  "/gifts",
  "/admin",
  "/admin/sessions",
  "/admin/finance",
  "/admin/content",
  "/admin/ops",
];
const devRoutes = [
  "/dev/design-system",
  "/dev/compare",
  "/dev/prototype-map",
  "/dev/reference/index.html",
];
const missing = [
  "/scripts/unknown-script",
  "/me/history/unknown-story",
  "/me/history/toString",
  "/dms/unknown-dm",
  "/costumes/unknown-costume",
  "/dev/reference/package.json",
  "/unrecognized-route",
];
const staticAssets = new Set();
let count = 0;
for (const route of routes) {
  const response = await fetch(new URL(route, base));
  assert.equal(
    response.status,
    200,
    `${route}: expected 200, got ${response.status}`,
  );
  const html = await response.text();
  if (route === '/') for (const match of html.matchAll(/(?:src|href)="([^"\s]*\/_next\/static\/[^"\s]+)"/g)) staticAssets.add(match[1].replaceAll('&amp;', '&'));
  assert.match(html, /十三雾/, `${route}: expected rendered brand content`);
  assert.doesNotMatch(
    html,
    /<title>Application error/i,
    `${route}: application error`,
  );
  count++;
}
for (const route of devRoutes) {
  const response = await fetch(new URL(route, base));
  assert.equal(
    response.status,
    production ? 404 : 200,
    `${route}: development gate`,
  );
  if (!production && route === "/dev/design-system") {
    const html = await response.text();
    assert.doesNotMatch(
      html,
      /<h1[^>]*>十三雾设计系统<\/h1>/,
      "Preview body must render on the client",
    );
  }
  count++;
}
for (const route of missing) {
  const response = await fetch(new URL(route, base));
  assert.equal(response.status, 404, `${route}: expected not found`);
  count++;
}
const aliases = [
  ["/index.html", "/"],
  ["/scripts.html", "/scripts"],
  ["/dm-detail.html?dm=adu", "/dms/adu"],
  ["/costume-detail.html?costume=chang-an", "/costumes/chang-an"],
  ["/booking.html?script=jinling", "/booking/new?script=jinling"],
];
for (const [route, target] of aliases) {
  const response = await fetch(new URL(route, base), { redirect: "manual" });
  assert.ok([307, 308].includes(response.status), `${route}: redirect status`);
  assert.equal(
    new URL(response.headers.get("location"), base).pathname +
      new URL(response.headers.get("location"), base).search,
    target,
    `${route}: redirect destination`,
  );
  count++;
}
assert.ok(staticAssets.size > 0, 'Expected Next.js client assets in rendered home page');
for (const asset of staticAssets) {
  const response = await fetch(new URL(asset, base));
  assert.equal(response.status, 200, `${asset}: missing client asset`);
  assert.doesNotMatch(response.headers.get('content-type') ?? '', /text\/html/, `${asset}: wrong asset response`);
  count++;
}
const manifest = await fetch(new URL("/manifest.webmanifest", base));
assert.equal(manifest.status, 200);
const manifestData = await manifest.json();
for (const icon of manifestData.icons) {
  const response = await fetch(new URL(icon.src, base));
  assert.equal(response.status, 200, `${icon.src}: manifest icon missing`);
  assert.match(response.headers.get("content-type") ?? "", /image\//);
  count++;
}
console.log(
  `PASS: ${count} route, redirect, environment-gate, client-asset and icon checks (${production ? "production" : "development"}).`,
);
