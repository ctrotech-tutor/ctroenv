import { defineEnv, string, number, boolean, pick } from "@ctroenv/core"
import { loadEnv } from "@ctroenv/node"

export const schema = {
  DATABASE_URL: string().url().describe("PostgreSQL connection URL"),
  PORT: number().port().default(3000),
  NODE_ENV: pick(["development", "production", "test"] as const).default("development"),
  JWT_SECRET: string().min(32).secret().describe("JWT signing secret"),
  LOG_LEVEL: pick(["debug", "info", "warn", "error"] as const).default("info"),
  CORS_ORIGIN: string().url().optional().describe("Allowed CORS origin"),
  FEATURE_X_ENABLED: boolean().default(false),
  API_VERSION: string().regex(/^\d+\.\d+$/).describe("API version (e.g. 1.0)"),
}

export const env = defineEnv(schema, { source: loadEnv() })
