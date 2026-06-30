import { afterEach, describe, expect, it, vi } from "vitest"
import type { EnvSource } from "../../define-env/source"
import { boolean, number, string } from "../../validators"
import { watchEnv } from "../index"

afterEach(() => {
  vi.useRealTimers()
})

describe("watchEnv()", () => {
  it("returns typed object for valid env", () => {
    const env = watchEnv({ KEY: string() }, { source: { KEY: "value" }, pollInterval: 500 })
    expect(env.KEY).toBe("value")
    env.unwatch()
  })

  it("throws CtroEnvError on missing required", () => {
    expect(() => watchEnv({ KEY: string() }, { source: {}, pollInterval: 500 })).toThrow(
      "Missing required",
    )
  })

  it("applies defaults for missing optional vars", () => {
    const env = watchEnv({ PORT: number().default(3000) }, { source: {}, pollInterval: 500 })
    expect(env.PORT).toBe(3000)
    env.unwatch()
  })

  it("allows undefined for optional vars without default", () => {
    const env = watchEnv({ OPTIONAL: string().optional() }, { source: {}, pollInterval: 500 })
    expect(env.OPTIONAL).toBeUndefined()
    env.unwatch()
  })

  it("prevents mutation", () => {
    const env = watchEnv({ KEY: string() }, { source: { KEY: "value" }, pollInterval: 500 })
    expect(() => {
      ;(env as Record<string, unknown>).KEY = "new"
    }).toThrow(TypeError)
    expect(() => {
      delete (env as Record<string, unknown>).KEY
    }).toThrow(TypeError)
    env.unwatch()
  })

  it("strips prefix when configured", () => {
    const env = watchEnv(
      { SECRET: string() },
      { source: { PREFIX_SECRET: "shh" }, prefix: "PREFIX_", pollInterval: 500 },
    )
    expect(env.SECRET).toBe("shh")
    env.unwatch()
  })

  it("exposes meta with get/has/keys/toJSON", () => {
    const env = watchEnv(
      { KEY: string(), SECRET: string().secret() },
      { source: { KEY: "hello", SECRET: "shh" }, pollInterval: 500 },
    )
    expect(env.meta.get("KEY")).toBe("hello")
    expect(env.meta.get("SECRET")).toBe("shh")
    expect(env.meta.has("KEY")).toBe(true)
    expect(env.meta.has("MISSING")).toBe(false)
    expect(env.meta.keys()).toEqual(["KEY", "SECRET"])
    expect(env.meta.toJSON()).toEqual({ KEY: "hello", SECRET: "shh" })
    env.unwatch()
  })

  it("masks secrets in property access", () => {
    const env = watchEnv(
      { SECRET: string().secret() },
      { source: { SECRET: "shh" }, pollInterval: 500 },
    )
    expect(env.SECRET).toBe("********")
    env.unwatch()
  })

  it("updates values when source changes", () => {
    vi.useFakeTimers()
    const source: Record<string, string | undefined> = { KEY: "initial" }

    const env = watchEnv(
      { KEY: string(), PORT: number().default(3000) },
      { source, pollInterval: 100 },
    )

    expect(env.KEY).toBe("initial")

    source.KEY = "updated"
    vi.advanceTimersByTime(100)

    expect(env.KEY).toBe("updated")
    expect(env.PORT).toBe(3000)
    env.unwatch()
  })

  it("fires onChange with old and new values", () => {
    vi.useFakeTimers()
    const source: Record<string, string | undefined> = { KEY: "old" }
    const changes: Array<{ key: string; oldVal: unknown; newVal: unknown }> = []

    const env = watchEnv(
      { KEY: string() },
      {
        source,
        pollInterval: 100,
        onChange(key, oldVal, newVal) {
          changes.push({ key, oldVal, newVal })
        },
      },
    )

    source.KEY = "new"
    vi.advanceTimersByTime(100)

    expect(changes).toHaveLength(1)
    expect(changes[0]).toEqual({ key: "KEY", oldVal: "old", newVal: "new" })
    env.unwatch()
  })

  it("fires onError when re-validation fails", () => {
    vi.useFakeTimers()
    const source: Record<string, string | undefined> = { KEY: "https://example.com" }
    const errors: Array<unknown> = []

    const env = watchEnv(
      { KEY: string().url() },
      {
        source,
        pollInterval: 100,
        onError(errs) {
          errors.push(...errs)
        },
      },
    )

    expect(env.KEY).toBe("https://example.com")

    source.KEY = "not-a-url"
    vi.advanceTimersByTime(100)

    expect(errors.length).toBeGreaterThan(0)
    expect(env.KEY).toBe("https://example.com")
    env.unwatch()
  })

  it("preserves old values when re-validation fails", () => {
    vi.useFakeTimers()
    const source: Record<string, string | undefined> = { KEY: "https://example.com" }

    const env = watchEnv({ KEY: string().url() }, { source, pollInterval: 100 })

    expect(env.KEY).toBe("https://example.com")

    source.KEY = "bad"
    vi.advanceTimersByTime(100)

    expect(env.KEY).toBe("https://example.com")
    env.unwatch()
  })

  it("unwatch stops polling", () => {
    vi.useFakeTimers()
    const source: Record<string, string | undefined> = { KEY: "initial" }

    const env = watchEnv({ KEY: string() }, { source, pollInterval: 100 })

    env.unwatch()

    source.KEY = "should-not-appear"
    vi.advanceTimersByTime(100)

    expect(env.KEY).toBe("initial")
  })

  it("does not poll when no source changes", () => {
    vi.useFakeTimers()
    const source: Record<string, string | undefined> = { KEY: "stable" }

    const env = watchEnv({ KEY: string() }, { source, pollInterval: 100 })

    vi.advanceTimersByTime(1000)
    expect(env.KEY).toBe("stable")
    env.unwatch()
  })

  it("coerces string to number", () => {
    const env = watchEnv({ PORT: number() }, { source: { PORT: "8080" }, pollInterval: 500 })
    expect(env.PORT).toBe(8080)
    env.unwatch()
  })

  it("coerces string to boolean", () => {
    const env = watchEnv({ DEBUG: boolean() }, { source: { DEBUG: "true" }, pollInterval: 500 })
    expect(env.DEBUG).toBe(true)
    env.unwatch()
  })

  it("works with custom EnvSource", () => {
    const customSource: EnvSource = {
      get(key: string): string | undefined {
        return key === "CUSTOM" ? "value" : undefined
      },
    }
    const env = watchEnv({ CUSTOM: string() }, { source: customSource, pollInterval: 500 })
    expect(env.CUSTOM).toBe("value")
    env.unwatch()
  })
})
