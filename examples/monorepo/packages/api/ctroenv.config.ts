import { defineConfig } from "@ctroenv/cli"

export default defineConfig({
  schema: "./src/env.ts",
  secrets: {
    mask: ["JWT_SECRET", "DATABASE_URL"],
    maskWith: "••••••••",
  },
})
