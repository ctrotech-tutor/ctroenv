import { defineEnv, number, string } from "@ctroenv/core"
import { bench, describe } from "vitest"

const schema = {
  DATABASE_URL: string().url(),
  PORT: number().port().default(3000),
  NODE_ENV: string(),
}

const source = {
  DATABASE_URL: "postgresql://localhost:5432/db",
  PORT: "4000",
  NODE_ENV: "production",
}

describe("schema parse (CLI path)", () => {
  bench("validate 3 fields", () => {
    defineEnv(schema, { source })
  })
})
