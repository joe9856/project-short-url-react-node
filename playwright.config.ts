import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["json", { outputFile: "docs/evidence/e2e.json" }],
  ],
  use: {
    baseURL: "http://localhost:5173",
    channel: process.env.CI ? undefined : "msedge",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-1440", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "tablet-768", use: { viewport: { width: 768, height: 1024 } } },
    { name: "mobile-390", use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "node scripts/local.mjs run dev",
    url: "http://localhost:5173/healthz",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
