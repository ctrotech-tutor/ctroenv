import { defineSchema, extendSchema, defineEnv, string, number } from "@ctroenv/core"

// packages/shared/src/env-schema.ts
const sharedSchema = defineSchema({
  DATABASE_URL: string().url(),
  REDIS_URL: string().url().optional(),
  LOG_LEVEL: string().default("info"),
})

// packages/api/src/env.ts
const apiSchema = extendSchema(sharedSchema, {
  PORT: number().port().default(4000),
  API_KEY: string().secret(),
})

// packages/worker/src/env.ts
const workerSchema = extendSchema(sharedSchema, {
  QUEUE_CONCURRENCY: number().positive().default(5),
  JOB_TIMEOUT: number().positive().default(30000),
})

const env = defineEnv(apiSchema)
env.DATABASE_URL // string
env.API_KEY      // "********"
