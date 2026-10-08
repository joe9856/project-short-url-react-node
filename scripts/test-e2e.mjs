import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
const url = new URL(process.env.DATABASE_URL);
if (!url.pathname.endsWith("_test")) url.pathname += "_test";
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  url.pathname !== "/short_url_react_node_test"
)
  throw new Error("Browser tests require the dedicated local test database");
const env = { ...process.env, DATABASE_URL: url.toString(), NODE_ENV: "test" };
const migration = spawnSync(
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
if (migration.status !== 0) process.exit(migration.status ?? 1);
const prisma = new PrismaClient({ datasourceUrl: url.toString() });
await prisma.rateLimit.deleteMany();
await prisma.$disconnect();
const result = spawnSync(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
  { env, stdio: "inherit" },
);
process.exit(result.status ?? 1);
