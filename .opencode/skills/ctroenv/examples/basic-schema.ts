import { defineEnv, string, number, boolean, pick } from "@ctroenv/core"

const env = defineEnv({
  NODE_ENV: pick(["development", "production", "test"] as const).default("development"),
  PORT: number().port().default(3000),
  DATABASE_URL: string().url().describe("PostgreSQL connection string"),
  REDIS_URL: string().url().optional(),
  DEBUG: boolean().default(false),
  JWT_SECRET: string().min(32).secret().describe("HS256 signing key"),
})

// Inferred types:
env.NODE_ENV      // "development" | "production" | "test"
env.PORT          // number (default 3000)
env.DATABASE_URL  // string
env.REDIS_URL     // string | undefined
env.DEBUG         // boolean (default false)
env.JWT_SECRET    // "********" (masked by Proxy)
env.meta.get("JWT_SECRET") // actual value
