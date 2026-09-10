import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { sourceRoutes } from "@/lib/routes";

const allowed = new Set([
  ...Object.keys(sourceRoutes),
  "assets/shisanwu-logo.jpg",
  "assets/wugang-laixin-cover.svg",
  "43947e6d13429e6e24ef2f82a3ac0265.jpg",
]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  if (process.env.NODE_ENV !== "development")
    return new Response("Not found", { status: 404 });
  const file = (await context.params).path.join("/");
  if (!allowed.has(file)) return new Response("Not found", { status: 404 });
  try {
    const root = await realpath(path.join(process.cwd(), "temp"));
    const target = await realpath(path.join(root, file));
    if (!target.startsWith(root + path.sep))
      return new Response("Not found", { status: 404 });
    const body = await readFile(target);
    const type = file.endsWith(".html")
      ? "text/html; charset=utf-8"
      : file.endsWith(".svg")
        ? "image/svg+xml"
        : "image/jpeg";
    return new Response(body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Reference unavailable", { status: 404 });
  }
}
