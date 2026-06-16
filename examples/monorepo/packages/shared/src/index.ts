import { defineSchema, pick, string } from "@ctroenv/core"

export const base = defineSchema({
  NODE_ENV: pick(["development", "staging", "production"] as const).default("development"),
  DATABASE_URL: string().url().secret().describe("PostgreSQL connection URL"),
  JWT_SECRET: string().min(32).secret().describe("JWT signing secret"),
  REDIS_URL: string().url().secret().optional().describe("Redis connection URL"),
})
