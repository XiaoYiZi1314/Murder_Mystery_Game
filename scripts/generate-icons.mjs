import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Use the image processor already shipped with Next.js to derive app icons
// from the supplied logo. This is an optional asset-maintenance command.
const require = createRequire(import.meta.url);
const sharp = require(
  require.resolve("sharp", {
    paths: [path.dirname(require.resolve("next/package.json"))],
  }),
);
const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "public", "icons");
const logo = path.join(root, "public", "assets", "shisanwu-logo.jpg");
await mkdir(output, { recursive: true });
for (const size of [192, 512]) {
  await sharp(logo)
    .resize(size, size, { fit: "contain", background: "#ffffff" })
    .png()
    .toFile(path.join(output, `icon-${size}.png`));
}
const insetLogo = await sharp(logo)
  .resize(360, 360, { fit: "contain", background: "#ffffff" })
  .png()
  .toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#ffffff" },
})
  .composite([{ input: insetLogo, gravity: "centre" }])
  .png()
  .toFile(path.join(output, "maskable-512.png"));
console.log(
  "Generated icon-192.png, icon-512.png and maskable-512.png from the supplied logo.",
);
