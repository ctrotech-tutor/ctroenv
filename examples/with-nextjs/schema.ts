import { string, number } from "@ctroenv/core"
import type { ClientServerSchema } from "@ctroenv/core"

// `satisfies` (not `: ClientServerSchema`) keeps the literal key/validator
// types that `defineEnv` needs to infer precise per-variable types.
export const schema = {
  server: {
    DATABASE_URL: string().url().describe("PostgreSQL connection URL"),
    JWT_SECRET: string().min(32).secret().describe("JWT signing secret"),
    REDIS_URL: string().url().describe("Redis connection URL"),
  },
  client: {
    NEXT_PUBLIC_API_URL: string().url().describe("Public API URL"),
    NEXT_PUBLIC_SENTRY_DSN: string().url().optional().describe("Sentry DSN"),
    NEXT_PUBLIC_APP_NAME: string().default("CtroEnv Demo"),
  },
} satisfies ClientServerSchema
