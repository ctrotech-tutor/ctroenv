import { describe, expect, it } from "vitest"
import { errInvalid, errMissing, errType, errWrap } from "../messages"

describe("errMissing", () => {
  it("creates a missing_required error with suggestion", () => {
    const err = errMissing("DATABASE_URL")
    expect(err.key).toBe("DATABASE_URL")
    expect(err.code).toBe("missing_required")
    expect(err.message).toContain("DATABASE_URL")
    expect(err.suggestion).toBeTruthy()
  })

  it("includes description when provided", () => {
    const err = errMissing("PORT", { description: "Server port" })
    expect(err.message).toContain("PORT")
    expect(err.message).toContain("Server port")
  })
})

describe("errType", () => {
  it("creates a type_mismatch error", () => {
    const err = errType("PORT", '"abc"', "a number", {
      suggestion: "Use a numeric string",
    })
    expect(err.key).toBe("PORT")
    expect(err.code).toBe("type_mismatch")
    expect(err.message).toContain("a number")
    expect(err.message).toContain('"abc"')
    expect(err.suggestion).toBe("Use a numeric string")
  })
})

describe("errInvalid", () => {
  it("creates an invalid_value error", () => {
    const err = errInvalid("PORT", 99999, "Invalid port number", {
      suggestion: "Use a value between 1 and 65535",
    })
    expect(err.key).toBe("PORT")
    expect(err.code).toBe("invalid_value")
    expect(err.message).toBe("Invalid port number")
    expect(err.suggestion).toContain("65535")
  })
})

describe("errWrap", () => {
  it("wraps with correct code", () => {
    const err = errWrap("KEY", "bad", "Something went wrong", "type_mismatch", {
      suggestion: "Fix it",
    })
    expect(err.key).toBe("KEY")
    expect(err.code).toBe("type_mismatch")
    expect(err.message).toBe("Something went wrong")
    expect(err.suggestion).toBe("Fix it")
    expect(err.value).toBe("bad")
  })
})
