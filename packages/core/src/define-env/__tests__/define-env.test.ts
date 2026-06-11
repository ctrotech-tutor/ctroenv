import { describe, expect, it } from "vitest"
import { boolean, number, string } from "../../validators"
import { defineEnv } from "../index"

describe("defineEnv()", () => {
  it("returns typed object for valid env", () => {
    const env = defineEnv(
      { DATABASE_URL: string(), PORT: number() },
      { source: { DATABASE_URL: "postgres://localhost/mydb", PORT: "5432" } },
    )
    expect(env.DATABASE_URL).toBe("postgres://localhost/mydb")
    expect(env.PORT).toBe(5432)
  })

  it("collects all errors before throwing", () => {
    try {
      defineEnv(
        { HOST: string(), PORT: number(), SECRET: string() },
        { source: { HOST: "localhost", PORT: "not-a-number" } },
      )
      expect.unreachable("Should have thrown")
    } catch (e) {
      expect(e).toBeInstanceOf(Error)
      expect((e as Error).name).toBe("CtroEnvError")
      const ctroErr = e as { errors: readonly unknown[] }
      expect(ctroErr.errors.length).toBe(2) // PORT invalid + SECRET missing
    }
  })

  it("applies defaults for missing optional vars", () => {
    const env = defineEnv(
      { PORT: number().default(3000), HOST: string().default("localhost") },
      { source: {} },
    )
    expect(env.PORT).toBe(3000)
    expect(env.HOST).toBe("localhost")
  })

  it("allows undefined for optional vars without default", () => {
    const env = defineEnv({ OPTIONAL: string().optional() }, { source: {} })
    expect(env.OPTIONAL).toBeUndefined()
  })

  it("freezes the returned object", () => {
    const env = defineEnv({ KEY: string() }, { source: { KEY: "value" } })
    expect(Object.isFrozen(env)).toBe(true)
  })

  it("strips prefix when configured", () => {
    const env = defineEnv(
      { SECRET: string() },
      { source: { PREFIX_SECRET: "shh" }, prefix: "PREFIX_" },
    )
    expect(env.SECRET).toBe("shh")
  })

  it("coerces string to number", () => {
    const env = defineEnv({ PORT: number() }, { source: { PORT: "8080" } })
    expect(env.PORT).toBe(8080)
  })

  it("coerces string to boolean", () => {
    const env = defineEnv(
      { DEBUG: boolean(), FEATURE: boolean() },
      { source: { DEBUG: "true", FEATURE: "0" } },
    )
    expect(env.DEBUG).toBe(true)
    expect(env.FEATURE).toBe(false)
  })

  it("throws on missing required", () => {
    try {
      defineEnv({ REQUIRED: string() }, { source: {} })
      expect.unreachable("Should have thrown")
    } catch (e) {
      expect((e as Error).name).toBe("CtroEnvError")
    }
  })
})
