import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
const url = new URL(process.env.DATABASE_URL);
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  url.pathname !== "/short_url_react_node"
)
  throw new Error("Local development database only");
const file = ".local/demo-account.md";
if (existsSync(file)) {
  console.log("Existing demo credentials preserved in .local/demo-account.md");
  process.exit(0);
}
const email = "demo@short-url.local";
const prisma = new PrismaClient();
const existing = await prisma.user.findUnique({ where: { email } });
await prisma.$disconnect();
if (existing)
  throw new Error("Demo email exists; refusing to reset its password");
const password = randomBytes(16).toString("hex");
const result = spawnSync(
  process.execPath,
  ["node_modules/tsx/dist/cli.mjs", "backend/prisma/seed.ts"],
  {
    env: { ...process.env, DEMO_EMAIL: email, DEMO_PASSWORD: password },
    stdio: "inherit",
    windowsHide: true,
  },
);
if (result.status !== 0) process.exit(result.status ?? 1);
mkdirSync(".local", { recursive: true });
writeFileSync(
  file,
  `# บัญชีสาธิต local เท่านั้น\n\nURL: http://localhost:5173/login\n\nอีเมล: ${email}\n\nรหัสผ่าน: ${password}\n\nไฟล์นี้ถูก ignore ห้าม commit/push หรือใช้รหัสผ่านนี้ใน production\n`,
);
console.log(
  "New demo account created; credentials saved privately in .local/demo-account.md",
);
