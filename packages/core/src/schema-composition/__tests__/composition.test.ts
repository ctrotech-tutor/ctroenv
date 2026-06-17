import { describe, expect, it } from "vitest"
import { defineEnv } from "../../define-env"
import { number, string } from "../../validators"
import { defineSchema, extendSchema } from "../index"

describe("defineSchema()", () => {
  it("returns the same schema object", () => {
    const schema = { KEY: string() }
    expect(defineSchema(schema)).toBe(schema)
  })

  it("preserves validator metadata", () => {
    const schema = defineSchema({
      PORT: number().port().default(3000).describe("Server port"),
    })
    expect(schema.PORT.metadata.typeLabel).toBe("number")
    expect(schema.PORT.metadata.hasDefault).toBe(true)
    expect(schema.PORT.metadata.defaultValue).toBe(3000)
    expect(schema.PORT.metadata.description).toBe("Server port")
  })
})

describe("extendSchema()", () => {
  it("merges two schemas", () => {
    const base = defineSchema({ PORT: number().default(3000) })
    const extended = extendSchema(base, { HOST: string().default("0.0.0.0") })
    expect(extended.PORT).toBeDefined()
    expect(extended.HOST).toBeDefined()
  })

  it("extension keys override base keys", () => {
    const base = defineSchema({ PORT: number().default(3000) })
    const extended = extendSchema(base, { PORT: number().default(4000) })
    expect(extended.PORT.metadata.defaultValue).toBe(4000)
  })

  it("works with defineEnv for validation", () => {
    const base = defineSchema({
      DATABASE_URL: string().url(),
    })
    const schema = extendSchema(base, {
      PORT: number().port().default(3000),
    })
    const env = defineEnv(schema, {
      source: { DATABASE_URL: "postgresql://localhost/db" },
    })
    expect(env.DATABASE_URL).toBe("postgresql://localhost/db")
    expect(env.PORT).toBe(3000)
  })

  it("handles secret markers from base schema", () => {
    const base = defineSchema({
      JWT_SECRET: string().secret(),
    })
    const schema = extendSchema(base, {
      PORT: number().default(3000),
    })
    expect(schema.JWT_SECRET.metadata.isSecret).toBe(true)
    expect(schema.PORT.metadata.isSecret).toBe(false)
  })

  it("merges three or more schemas via chaining", () => {
    const a = defineSchema({ A: string() })
    const b = defineSchema({ B: string() })
    const c = defineSchema({ C: string() })
    const merged = extendSchema(extendSchema(a, b), c)
    expect(merged.A).toBeDefined()
    expect(merged.B).toBeDefined()
    expect(merged.C).toBeDefined()
  })
})
