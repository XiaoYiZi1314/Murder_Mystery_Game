import { cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Next.js standalone output needs static assets beside server.js to run by itself.
const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, ".next", "standalone");
await cp(path.join(root, "public"), path.join(output, "public"), {
  recursive: true,
  force: true,
});
await cp(
  path.join(root, ".next", "static"),
  path.join(output, ".next", "static"),
  { recursive: true, force: true },
);
console.log(
  "Prepared standalone server with public and Next.js static assets.",
);
