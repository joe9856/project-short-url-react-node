import { spawnSync } from "node:child_process";
const url = new URL(process.env.DATABASE_URL);
if (!url.pathname.endsWith("_test")) url.pathname += "_test";
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  url.pathname !== "/short_url_react_node_test"
)
  throw new Error(
    "MySQL tests require the dedicated local short_url_react_node_test database",
  );
const env = { ...process.env, DATABASE_URL: url.toString(), NODE_ENV: "test" };
let result = spawnSync(
  process.execPath,
  [
    "node_modules/prisma/build/index.js",
    "migrate",
    "deploy",
    "--schema",
    "backend/prisma/schema.prisma",
  ],
  { env, stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status ?? 1);
result = spawnSync(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "--config",
    "vitest.mysql.config.ts",
  ],
  { env, stdio: "inherit" },
);
process.exit(result.status ?? 1);
