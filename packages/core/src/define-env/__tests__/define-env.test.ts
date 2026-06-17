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
    expect(() => {
      ;(env as Record<string, unknown>).KEY = "new"
    }).toThrow(TypeError)
    expect(() => {
      delete (env as Record<string, unknown>).KEY
    }).toThrow(TypeError)
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

  it("throws clear error for non-validator schema entries", () => {
    try {
      defineEnv({ server: { KEY: string() }, client: {} } as never, { source: { KEY: "value" } })
      expect.unreachable("Should have thrown")
    } catch (e) {
      expect(e).toBeInstanceOf(TypeError)
      expect((e as TypeError).message).toContain("server")
      expect((e as TypeError).message).toContain("not a validator")
    }
  })

  describe("secret masking", () => {
    it("masks secret values in the env object", () => {
      const env = defineEnv(
        { JWT_SECRET: string().secret(), API_KEY: string().secret() },
        { source: { JWT_SECRET: "my-secret-token", API_KEY: "sk-12345" } },
      )
      expect(env.JWT_SECRET).toBe("********")
      expect(env.API_KEY).toBe("********")
    })

    it("leaves non-secret values unmasked", () => {
      const env = defineEnv(
        {
          PUBLIC: string(),
          SECRET: string().secret(),
        },
        { source: { PUBLIC: "visible", SECRET: "hidden" } },
      )
      expect(env.PUBLIC).toBe("visible")
      expect(env.SECRET).toBe("********")
    })

    it("exposes raw values via env.meta.get()", () => {
      const env = defineEnv(
        { JWT_SECRET: string().secret() },
        { source: { JWT_SECRET: "my-secret-token" } },
      )
      expect(env.meta.get("JWT_SECRET")).toBe("my-secret-token")
    })

    it("env.meta.has() works correctly", () => {
      const env = defineEnv({ KEY: string().secret() }, { source: { KEY: "value" } })
      expect(env.meta.has("KEY")).toBe(true)
      expect(env.meta.has("NONEXISTENT")).toBe(false)
    })

    it("env.meta.keys() returns all keys", () => {
      const env = defineEnv({ A: string(), B: string().secret() }, { source: { A: "a", B: "b" } })
      expect(env.meta.keys()).toEqual(["A", "B"])
    })

    it("JSON.stringify masks secret values and omits meta", () => {
      const env = defineEnv(
        { PUBLIC: string(), SECRET: string().secret() },
        { source: { PUBLIC: "hello", SECRET: "hidden" } },
      )
      const json = JSON.stringify(env)
      expect(json).toContain('"PUBLIC":"hello"')
      expect(json).not.toContain("hidden")
      expect(json).toContain('"SECRET":"********"')
      expect(json).not.toContain("meta")
    })

    it("does not mask secrets in meta.toJSON()", () => {
      const env = defineEnv({ SECRET: string().secret() }, { source: { SECRET: "hidden" } })
      // meta.toJSON() returns string values of all keys (for serialization)
      expect(env.meta.toJSON()).toEqual({ SECRET: "hidden" })
    })

    it("masks secret values in error output", () => {
      try {
        defineEnv(
          {
            SECRET: string()
              .secret()
              .validate(() => "always fails"),
          },
          { source: { SECRET: "some-value" } },
        )
        expect.unreachable("Should have thrown")
      } catch (e) {
        const errStr = String(e)
        expect(errStr).not.toContain("some-value")
        expect(errStr).not.toContain("********") // value field is masked
      }
    })

    it("meta is accessible but non-enumerable", () => {
      const env = defineEnv({ KEY: string().secret() }, { source: { KEY: "value" } })
      const keys = Object.keys(env)
      expect(keys).not.toContain("meta")
      expect(env.meta).toBeDefined()
      expect(env.meta.get("KEY")).toBe("value")
    })

    it("secret-only schema still freezes via Proxy", () => {
      const env = defineEnv({ KEY: string().secret() }, { source: { KEY: "value" } })
      expect(() => {
        ;(env as Record<string, unknown>).NEW = "x"
      }).toThrow()
    })
  })
})
