import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: process.env.INTEGRATION_TESTS === "true" ? [] : ["tests/integration/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "tests/",
        "dist/",
        "**/*.test.ts",
        "**/index.ts",
        "**/types/",
        "src/types/**"
      ],
      statements: 75,
      branches: 70,
      functions: 75,
      lines: 75,
      all: true,
      skipFull: false
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
});
