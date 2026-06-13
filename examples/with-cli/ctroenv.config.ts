import { defineConfig } from "@ctroenv/cli"

export default defineConfig({
  schema: "./src/env.ts",
  sources: {
    default: ".env",
  },
  output: {
    example: ".env.example",
    docs: "ENVIRONMENT.md",
  },
  secrets: {
    mask: ["JWT_SECRET", "DATABASE_URL", "STRIPE_API_KEY"],
    maskWith: "••••••••",
  },
})
