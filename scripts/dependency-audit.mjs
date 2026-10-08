import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const result = spawnSync(
  process.execPath,
  [process.env.npm_execpath, "audit", "--omit=dev", "--json"],
  { encoding: "utf8", env: process.env },
);
const report = JSON.parse(result.stdout);
mkdirSync("docs/evidence", { recursive: true });
writeFileSync(
  "docs/evidence/audit-production.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report.metadata?.vulnerabilities || report.error));
process.exit(result.status ?? 1);
