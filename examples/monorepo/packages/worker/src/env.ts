import { defineEnv, extendSchema, number, string } from "@ctroenv/core"
import { loadEnv } from "@ctroenv/node"
import { base } from "@example/shared-config"

export const schema = extendSchema(base, {
  QUEUE_CONCURRENCY: number().int().min(1).default(5).describe("Number of concurrent queue workers"),
  WORKER_TIMEOUT: number().int().min(1000).default(30000).describe("Worker timeout in milliseconds"),
  WORKER_LOG_LEVEL: string().default("info").describe("Worker-specific log level"),
})

export const env = defineEnv(schema, { source: loadEnv({ path: "../.." }) })
