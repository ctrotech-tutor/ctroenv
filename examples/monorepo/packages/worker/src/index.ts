import { env } from "./env"

async function main() {
  console.log(`\n  ✓ Worker starting...`)
  console.log(`  ✓ Environment:    ${env.NODE_ENV}`)
  console.log(`  ✓ Concurrency:    ${env.QUEUE_CONCURRENCY}`)
  console.log(`  ✓ Timeout:        ${env.WORKER_TIMEOUT}ms`)
  console.log(`  ✓ Redis:          ${env.REDIS_URL}`)
  console.log(`  ✓ Log level:      ${env.WORKER_LOG_LEVEL}\n`)

  // Simulate worker loop
  let count = 0
  setInterval(() => {
    count++
    console.log(`  [${new Date().toISOString()}] Processed job #${count}`)
  }, 5000)
}

main().catch((err) => {
  if (err instanceof Error) {
    console.error(err.message)
  } else {
    console.error(String(err))
  }
  process.exit(1)
})
