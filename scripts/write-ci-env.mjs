import { writeFileSync } from "node:fs";
if (
  process.env.CI !== "true" ||
  !new URL(process.env.DATABASE_URL).pathname.endsWith("_test")
)
  throw new Error("CI test database only");
writeFileSync(
  "backend/.env",
  ["DATABASE_URL", "APP_URL", "RATE_LIMIT_SECRET", "NODE_ENV"]
    .map((name) => `${name}=${JSON.stringify(process.env[name])}`)
    .join("\n"),
);
