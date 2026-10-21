import { defineConfig } from "@ctroenv/cli"

export default defineConfig({
  schema: "./src/env.ts",
  sources: {
    default: "../../.env",
  },
  secrets: {
    mask: ["JWT_SECRET", "DATABASE_URL"],
    maskWith: "••••••••",
  },
})
