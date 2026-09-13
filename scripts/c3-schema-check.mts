/** Read-only actual-test-database diff; never apply the generated SQL. */
import "../tests/integration/helpers";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const result = spawnSync(
  process.execPath,
  [
    "node_modules/prisma/build/index.js",
    "migrate",
    "diff",
    "--from-url",
    process.env.DATABASE_URL!,
    "--to-schema-datamodel",
    "prisma/schema.prisma",
    "--script",
    "--exit-code",
  ],
  { encoding: "utf8" },
);
mkdirSync("test-results", { recursive: true });
writeFileSync("test-results/c3-schema-diff.sql", result.stdout || "");
if (result.status !== 0) {
  console.error(
    result.stderr ||
      "Schema diff is not empty. Inspect test-results/c3-schema-diff.sql; DO NOT apply automatically.",
  );
  process.exitCode = result.status ?? 1;
} else
  console.log(
    "PASS: actual test database matches Prisma schema, including preserved legacy archives; no migration SQL.",
  );
