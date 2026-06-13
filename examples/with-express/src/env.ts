import { defineEnv, string, number, pick } from "@ctroenv/core"
import { loadEnv } from "@ctroenv/node"

export const schema = {
  PORT: number().port().default(3000),
  HOST: string().default("0.0.0.0"),
  DATABASE_URL: string().url().describe("PostgreSQL connection URL"),
  JWT_SECRET: string().min(32).secret().describe("JWT signing secret"),
  CORS_ORIGIN: string().url().describe("Allowed CORS origin"),
  NODE_ENV: pick(["development", "production", "test"] as const).default("development"),
  LOG_LEVEL: pick(["debug", "info", "warn", "error"] as const).default("info"),
  REDIS_URL: string().url().optional().describe("Redis connection URL"),
}

export const env = defineEnv(schema, { source: loadEnv() })
