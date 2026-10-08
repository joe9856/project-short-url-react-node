import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
const destination = "backend/prisma/migrations/20261009000000_init";
if (existsSync(`${destination}/migration.sql`))
  throw new Error("Migration exists; refusing to overwrite");
const node = ".runtime/node_modules/node/bin/node.exe";
const result = spawnSync(
  node,
  [
    "node_modules/prisma/build/index.js",
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema-datamodel",
    "backend/prisma/schema.prisma",
    "--script",
  ],
  {
    env: {
      ...process.env,
      DATABASE_URL: "mysql://unused:unused@localhost:3308/short_url_react_node",
    },
    encoding: "utf8",
  },
);
if (result.status !== 0) {
  console.error(result.stderr);
  process.exit(1);
}
mkdirSync(destination, { recursive: true });
writeFileSync(`${destination}/migration.sql`, result.stdout);
console.log("Initial Prisma migration generated.");
