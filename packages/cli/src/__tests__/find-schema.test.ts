import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { findSchema } from "../utils/find-schema"

const FIXTURES = resolve(__dirname, "fixtures")

describe("findSchema", () => {
  it("finds schema in basic fixture", () => {
    const result = findSchema(resolve(FIXTURES, "basic"))
    expect(result).not.toBeNull()
    expect(result).toContain("env.ts")
  })

  it("finds schema in minimal fixture", () => {
    const result = findSchema(resolve(FIXTURES, "minimal"))
    expect(result).not.toBeNull()
    expect(result).toContain("env.ts")
  })

  it("uses configPath when provided", () => {
    const result = findSchema(FIXTURES, "basic/env.ts")
    expect(result).not.toBeNull()
    expect(result).toContain("env.ts")
  })

  it("returns null when configPath does not exist", () => {
    const result = findSchema(FIXTURES, "nonexistent.ts")
    expect(result).toBeNull()
  })

  it("returns null when no schema found", () => {
    const result = findSchema(resolve(FIXTURES, ".."))
    expect(result).toBeNull()
  })
})
