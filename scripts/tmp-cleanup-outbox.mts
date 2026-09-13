import { spawnSync } from "node:child_process";
import { loadEnvFile } from "../src/server/config";

loadEnvFile(".env.test");
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error("TEST_DATABASE_URL 缺失");

const r = spawnSync(process.execPath, ["--import", "tsx", "scripts/tmp-cleanup-core.mts"], {
  env: { ...process.env, DATABASE_URL: testUrl },
  encoding: "utf-8",
});
process.stdout.write(r.stdout ?? "");
process.stderr.write(r.stderr ?? "");
process.exit(r.status ?? 1);
