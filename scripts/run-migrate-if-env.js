// scripts/run-migrate-if-env.js
const { execSync } = require("node:child_process");

const url = process.env.DATABASE_URL || "";
if (!url || !/^postgres(ql)?:\/\//.test(url)) {
  console.log("[migrate] Skipped: DATABASE_URL not set to postgres://");
  process.exit(0);
}

try {
  execSync("prisma migrate deploy", { stdio: "inherit" });
} catch (e) {
  console.error("[migrate] Error:", e?.message || e);
  process.exit(1);
}
