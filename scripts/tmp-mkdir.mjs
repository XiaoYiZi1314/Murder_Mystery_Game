import { mkdirSync } from "node:fs";
const dirs = [
  "src/app/api/scripts/[id]",
  "src/app/api/costumes/[id]",
  "src/app/api/dms/[id]",
  "src/app/api/admin/scripts/[id]",
  "src/app/api/admin/costumes/[id]",
  "src/app/api/admin/dms/[id]",
  "src/app/api/admin/tags/[id]",
];
for (const d of dirs) mkdirSync(d, { recursive: true });
console.log("dirs ok:", dirs.length);
