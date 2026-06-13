import express from "express"
import { env } from "./env"

const app = express()

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    nodeEnv: env.NODE_ENV,
    apiVersion: env.API_VERSION,
  })
})

app.listen(env.PORT, env.HOST, () => {
  console.log(`\n  ✓ API server running at http://${env.HOST}:${env.PORT}`)
  console.log(`  ✓ Environment: ${env.NODE_ENV}`)
  console.log(`  ✓ Database:    ${env.DATABASE_URL}\n`)
})
