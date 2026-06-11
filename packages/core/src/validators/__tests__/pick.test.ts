import { describe, expect, it } from "vitest"
import { pick } from "../pick"

describe("pick()", () => {
  it("accepts valid value", () => {
    const result = pick(["development", "staging", "production"]).parse("production", {
      key: "NODE_ENV",
      path: ["NODE_ENV"],
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.value).toBe("production")
  })

  it("rejects invalid value", () => {
    const result = pick(["development", "staging", "production"]).parse("prod", {
      key: "NODE_ENV",
      path: ["NODE_ENV"],
    })
    expect(result.success).toBe(false)
  })

  it("provides fuzzy suggestion", () => {
    const result = pick(["development", "staging", "production"]).parse("prod", {
      key: "NODE_ENV",
      path: ["NODE_ENV"],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors[0].suggestion).toBeDefined()
    }
  })

  it("rejects non-string input", () => {
    const result = pick(["a", "b"]).parse(123, {
      key: "TEST",
      path: ["TEST"],
    })
    expect(result.success).toBe(false)
  })

  it("accepts case-sensitive match", () => {
    const result = pick(["Production", "development"]).parse("Production", {
      key: "TEST",
      path: ["TEST"],
    })
    expect(result.success).toBe(true)
  })
})
