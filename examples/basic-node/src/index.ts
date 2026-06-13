async function main() {
  const { env } = await import("./env")

  console.log("\n  ✓ Environment validated successfully\n")
  console.log(`  DATABASE_URL:      ${env.DATABASE_URL}`)
  console.log(`  PORT:              ${env.PORT}`)
  console.log(`  NODE_ENV:          ${env.NODE_ENV}`)
  console.log(`  LOG_LEVEL:         ${env.LOG_LEVEL}`)
  console.log(`  CORS_ORIGIN:       ${env.CORS_ORIGIN ?? "(not set)"}`)
  console.log(`  FEATURE_X_ENABLED: ${env.FEATURE_X_ENABLED}`)
  console.log(`  API_VERSION:       ${env.API_VERSION}`)
  console.log(`  JWT_SECRET:        (masked — ${env.JWT_SECRET.length} chars)`)
  console.log()
}

main().catch((err) => {
  if (err instanceof Error) {
    console.error(err.message)
  } else {
    console.error(String(err))
  }
  process.exit(1)
})
