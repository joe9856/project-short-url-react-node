import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    reporters: ["default", "json"],
    outputFile: "docs/evidence/mysql.json",
    environment: "node",
    include: ["tests/mysql/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
