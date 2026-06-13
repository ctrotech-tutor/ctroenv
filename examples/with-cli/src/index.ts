import { defineEnv } from "@ctroenv/core"
import { loadEnv } from "@ctroenv/node"
import { schema } from "./env"

try {
  const env = defineEnv(schema, { source: loadEnv() })

  console.log("\n  ✓ Environment validated successfully\n")
  console.log(`  NODE_ENV:          ${env.NODE_ENV}`)
  console.log(`  PORT:              ${env.PORT}`)
  console.log(`  DATABASE_URL:      ${env.DATABASE_URL}`)
  console.log(`  CORS_ORIGIN:       ${env.CORS_ORIGIN}`)
  console.log(`  LOG_LEVEL:         ${env.LOG_LEVEL}`)
  console.log(`  API_VERSION:       ${env.API_VERSION}`)
  console.log(`  EMAIL_FROM:        ${env.EMAIL_FROM}`)
  console.log(`  JWT_EXPIRES_IN:    ${env.JWT_EXPIRES_IN}`)
  console.log(`  ENABLE_METRICS:    ${env.ENABLE_METRICS}`)
  console.log(`  ENABLE_SWAGGER:    ${env.ENABLE_SWAGGER}`)
  console.log(`  DB_POOL:           ${env.DB_POOL_MIN}-${env.DB_POOL_MAX}`)
  console.log(`  HOST:              ${env.HOST}`)
  console.log(`  REDIS_URL:         ${env.REDIS_URL ?? "(not set)"}`)
  console.log(`  SENTRY_DSN:        ${env.SENTRY_DSN ?? "(not set)"}`)
  console.log()
} catch (err) {
  if (err instanceof Error) {
    console.error(err.message)
  } else {
    console.error(String(err))
  }
  process.exit(1)
}
