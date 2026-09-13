// 环境自检：MySQL/Redis/dev server/迁移状态（C2 集成测试前置）。
import net from "node:net";
import { readdirSync } from "node:fs";

function portCheck(port, name) {
  return new Promise((resolve) => {
    const s = net.connect(port, "127.0.0.1");
    s.setTimeout(2500);
    s.on("connect", () => { console.log(name + ":UP"); s.end(); resolve(); });
    s.on("timeout", () => { console.log(name + ":TIMEOUT"); s.destroy(); resolve(); });
    s.on("error", (e) => { console.log(name + ":DOWN(" + e.code + ")"); s.destroy(); resolve(); });
  });
}

await portCheck(3306, "mysql(3306)");
await portCheck(6379, "redis(6379)");
try {
  const r = await fetch("http://localhost:3000/api/auth/csrf");
  console.log("dev_server(3000):" + r.status);
} catch {
  console.log("dev_server(3000):DOWN");
}
try {
  const dirs = readdirSync("prisma/migrations").filter((d) => !d.startsWith("."));
  console.log("migrations: " + (dirs.length ? dirs.join(", ") : "(none)"));
} catch {
  console.log("migrations: n/a");
}
console.log("node: " + process.version);
