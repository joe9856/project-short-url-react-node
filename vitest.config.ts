import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    reporters: ["default", "json"],
    outputFile: "docs/evidence/unit.json",
    projects: [
      {
        test: {
          name: "backend-unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          setupFiles: ["tests/unit/setup.ts"],
        },
      },
      {
        test: {
          name: "frontend",
          environment: "jsdom",
          include: ["frontend/src/**/*.test.tsx"],
          setupFiles: ["tests/frontend-setup.ts"],
        },
      },
    ],
  },
});
