import { string, number, boolean, pick } from "@ctroenv/core"

export const schema = {
  NODE_ENV: pick(["development", "staging", "production"] as const).default("development"),

  // Database
  DATABASE_URL: string().url().secret().describe("PostgreSQL connection URL"),
  DB_POOL_MIN: number().int().min(1).default(2).describe("Minimum database pool connections"),
  DB_POOL_MAX: number().int().min(1).default(10).describe("Maximum database pool connections"),

  // Auth
  JWT_SECRET: string().min(32).secret().describe("JWT signing secret"),
  JWT_EXPIRES_IN: string().default("7d").describe("JWT expiration duration"),

  // Server
  PORT: number().port().default(3000),
  HOST: string().default("0.0.0.0"),
  CORS_ORIGIN: string().url().describe("Allowed CORS origin"),

  // Cache
  REDIS_URL: string().url().secret().optional().describe("Redis connection URL"),

  // Features
  ENABLE_METRICS: boolean().default(false).describe("Enable Prometheus metrics endpoint"),
  ENABLE_SWAGGER: boolean().default(true).describe("Enable Swagger docs"),
  LOG_LEVEL: pick(["debug", "info", "warn", "error"] as const).default("info"),

  // External
  SENTRY_DSN: string().url().optional().describe("Sentry error tracking DSN"),
  STRIPE_API_KEY: string().secret().optional().describe("Stripe secret API key"),
  EMAIL_FROM: string().email().default("noreply@example.com").describe("Sender email address"),
  API_VERSION: string().regex(/^\d+\.\d+$/).describe("API version (e.g. 1.0)"),
}
