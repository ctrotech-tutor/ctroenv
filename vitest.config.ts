import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@ctroenv/core": resolve("packages/core/src"),
      "@ctroenv/shared": resolve("packages/shared/src"),
      "@ctroenv/cli": resolve("packages/cli/src"),
      "@ctroenv/node": resolve("packages/node/src"),
      "@ctroenv/vite": resolve("packages/vite/src"),
      "@ctroenv/nextjs": resolve("packages/nextjs/src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["packages/*/src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**"],
      exclude: [
        "**/__benchmarks__/**",
        "**/__tests__/fixtures/**",
        "**/types/**",
        "**/nextjs/**",
        "packages/cli/src/cli.ts",
        "packages/cli/src/export.ts",
        "packages/cli/src/index.ts",
        "packages/cli/src/commands/index.ts",
        "packages/cli/src/utils/index.ts",
        "packages/core/src/index.ts",
        "packages/core/src/errors/index.ts",
        "packages/core/src/validators/index.ts",
        "packages/core/src/validators/refinements/index.ts",
        "packages/shared/src/index.ts",
        "packages/shared/src/logger/index.ts",
      ],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
  },
})
