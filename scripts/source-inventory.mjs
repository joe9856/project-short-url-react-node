import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(path.join(directory, entry.name))
      : [path.join(directory, entry.name)],
  );
}
const report = {
  measuredAt: new Date().toISOString(),
  method:
    "src only: .ts/.tsx/.css including .d.ts, excluding .test files; no generated/build/runtime/docs",
  applications: [],
};
for (const directory of [
  "frontend/src",
  "backend/src",
  "../short-url-demo/src",
]) {
  const source = files(directory).filter(
    (file) => /\.(tsx?|css)$/.test(file) && !file.includes(".test."),
  );
  report.applications.push({
    directory,
    files: source.length,
    lines: source.reduce(
      (sum, file) => sum + readFileSync(file, "utf8").split("\n").length,
      0,
    ),
  });
}
mkdirSync("docs/evidence", { recursive: true });
writeFileSync(
  "docs/evidence/source-inventory.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report.applications));
