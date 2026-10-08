import { readFileSync, writeFileSync } from "node:fs";
const url = new URL(process.argv[2]);
if (
  url.protocol !== "https:" ||
  url.username ||
  url.password ||
  url.pathname !== "/" ||
  url.search ||
  url.hash ||
  url.hostname.endsWith(".invalid")
)
  throw new Error("Provide the confirmed HTTPS backend origin");
const file = "frontend/vercel.json";
const config = JSON.parse(readFileSync(file, "utf8"));
for (const rewrite of config.rewrites) {
  if (rewrite.source === "/api/:path*")
    rewrite.destination = `${url.origin}/api/:path*`;
  if (rewrite.source === "/s/:path*")
    rewrite.destination = `${url.origin}/s/:path*`;
  if (rewrite.source === "/healthz")
    rewrite.destination = `${url.origin}/healthz`;
}
writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
console.log("Frontend rewrites configured. No deployment was performed.");
