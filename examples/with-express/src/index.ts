import express from "express"

async function main() {
  const { env, schema } = await import("./env")

  const app = express()

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      env: Object.keys(schema),
    })
  })

  app.listen(env.PORT, env.HOST, () => {
    console.log(`\n  ✓ Server running at http://${env.HOST}:${env.PORT}`)
    console.log(`  ✓ Environment: ${env.NODE_ENV}`)
    console.log(`  ✓ Health check: http://${env.HOST}:${env.PORT}/health\n`)
  })
}

main().catch((err) => {
  if (err instanceof Error) {
    console.error(err.message)
  } else {
    console.error(String(err))
  }
  process.exit(1)
})
