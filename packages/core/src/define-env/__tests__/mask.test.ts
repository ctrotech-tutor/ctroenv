import { describe, expect, it } from "vitest"
import { createMaskedEnv } from "../mask"

describe("createMaskedEnv", () => {
  it("includes extra methods in ownKeys when not already present", () => {
    function myHelper() {}
    const env = createMaskedEnv({ FOO: "bar" }, new Set(), "********", undefined, {
      myHelper,
    })
    const names = Object.getOwnPropertyNames(env)
    expect(names).toContain("myHelper")
    expect(names).toContain("FOO")
    expect(names).toContain("meta")
  })

  it("exposes extra method via property access", () => {
    function myHelper() {
      return "called"
    }
    const env = createMaskedEnv({ FOO: "bar" }, new Set(), "********", undefined, {
      myHelper,
    })
    expect(env).toHaveProperty("myHelper")
    expect((env as Record<string, unknown>).myHelper()).toBe("called")
  })

  it("includes extra methods in util.inspect custom output", () => {
    function myHelper() {}
    const env = createMaskedEnv({ FOO: "bar" }, new Set(), "********", undefined, {
      myHelper,
    })
    const kInspect = Symbol.for("nodejs.util.inspect.custom")
    const envAny = env as Record<string | symbol, unknown>
    const inspected = (
      envAny[kInspect] as (depth: number, opts: unknown) => Record<string, unknown>
    )(0, {})
    expect(inspected).toHaveProperty("FOO")
    expect(inspected).toHaveProperty("myHelper")
    expect(inspected.myHelper).toBe(myHelper)
  })

  it("does not include meta or inspect symbol in util.inspect output", () => {
    function myHelper() {}
    const env = createMaskedEnv({ FOO: "bar" }, new Set(), "********", undefined, {
      myHelper,
    })
    const kInspect = Symbol.for("nodejs.util.inspect.custom")
    const envAny = env as Record<string | symbol, unknown>
    const inspected = (
      envAny[kInspect] as (depth: number, opts: unknown) => Record<string, unknown>
    )(0, {})
    expect(inspected).not.toHaveProperty("meta")
    expect(Object.getOwnPropertySymbols(inspected)).not.toContain(
      Symbol.for("nodejs.util.inspect.custom"),
    )
  })
})
