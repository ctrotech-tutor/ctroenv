import { defineEnv, string, number } from "@ctroenv/core"
import { loadEnv } from "@ctroenv/node"
import { base } from "@example/shared-config"

export const schema = {
  ...base,
  PORT: number().port().default(3000),
  HOST: string().default("0.0.0.0"),
  CORS_ORIGIN: string().url().describe("Allowed CORS origin"),
  API_VERSION: string().regex(/^\d+\.\d+$/).describe("API version"),
}

export const env = defineEnv(schema, { source: loadEnv({ path: "../.." }) })
