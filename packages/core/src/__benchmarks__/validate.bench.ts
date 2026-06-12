import { bench, describe } from "vitest"
import { defineEnv } from "../define-env"
import { boolean, number, pick, string } from "../validators"

const smallSchema = {
  DATABASE_URL: string().url(),
  PORT: number().port().default(3000),
  NODE_ENV: pick(["development", "production", "test"] as const),
  JWT_SECRET: string().min(32).secret(),
  DEBUG: boolean().optional(),
}

const largeSchema = {
  VAR_01: string(),
  VAR_02: string().url(),
  VAR_03: string().email(),
  VAR_04: string().min(1),
  VAR_05: string().max(100),
  VAR_06: number(),
  VAR_07: number().port(),
  VAR_08: number().int(),
  VAR_09: number().positive(),
  VAR_10: number().min(0).max(100),
  VAR_11: boolean(),
  VAR_12: pick(["a", "b", "c"] as const),
  VAR_13: string().regex(/^[a-z]+$/),
  VAR_14: string().secret(),
  VAR_15: string().url().describe("A URL"),
  VAR_16: number().default(0),
  VAR_17: number().optional(),
  VAR_18: boolean().optional(),
  VAR_19: pick(["x", "y", "z"] as const),
  VAR_20: string().min(1).max(255),
}

const validSource = {
  DATABASE_URL: "postgresql://localhost:5432/db",
  PORT: "3000",
  NODE_ENV: "development",
  JWT_SECRET: "a".repeat(32),
}

const validLargeSource: Record<string, string> = {}
for (let i = 1; i <= 20; i++) {
  const key = `VAR_${String(i).padStart(2, "0")}`
  if (key === "VAR_12") {
    validLargeSource[key] = "a"
    continue
  }
  if (key === "VAR_19") {
    validLargeSource[key] = "x"
    continue
  }
  validLargeSource[key] = "test_value"
}

const invalidSource = {
  DATABASE_URL: "not-a-url",
  PORT: "abc",
  JWT_SECRET: "short",
}

describe("validate small schema (5 fields)", () => {
  bench("pass", () => {
    defineEnv(smallSchema, { source: validSource })
  })

  bench("fail (2 errors)", () => {
    try {
      defineEnv(smallSchema, { source: invalidSource })
    } catch {
      // expected
    }
  })
})

describe("validate large schema (20 fields)", () => {
  bench("pass", () => {
    defineEnv(largeSchema, { source: validLargeSource })
  })

  bench("fail (3 errors)", () => {
    const bad = { ...validLargeSource, VAR_02: "not-url", VAR_07: "99999", VAR_13: "INVALID" }
    try {
      defineEnv(largeSchema, { source: bad })
    } catch {
      // expected
    }
  })
})
