import { beforeEach, describe, expect, it } from "vitest"
import { formatErrors, hasColors } from "../../errors/formatter"
import { ValidationError } from "../../errors/validation-error"

describe("hasColors()", () => {
  const prevNoColor = process.env.NO_COLOR
  const prevCi = process.env.CI
  const prevTerm = process.env.TERM

  beforeEach(() => {
    process.env.NO_COLOR = prevNoColor
    process.env.CI = prevCi
    process.env.TERM = prevTerm
  })

  it("returns true by default", () => {
    delete process.env.NO_COLOR
    delete process.env.CI
    process.env.TERM = "xterm-256color"
    expect(hasColors()).toBe(true)
  })

  it("returns false when NO_COLOR is set", () => {
    process.env.NO_COLOR = "1"
    expect(hasColors()).toBe(false)
  })

  it("returns false when CI is set", () => {
    delete process.env.NO_COLOR
    process.env.CI = "true"
    expect(hasColors()).toBe(false)
  })

  it("returns false when TERM is dumb", () => {
    delete process.env.NO_COLOR
    delete process.env.CI
    process.env.TERM = "dumb"
    expect(hasColors()).toBe(false)
  })
})

describe("formatErrors()", () => {
  beforeEach(() => {
    process.env.NO_COLOR = "1"
  })

  it("formats missing required errors", () => {
    const errors = [
      new ValidationError({
        key: "DATABASE_URL",
        message: "Missing required environment variable: DATABASE_URL",
        code: "missing_required",
      }),
      new ValidationError({
        key: "JWT_SECRET",
        message: "Missing required environment variable: JWT_SECRET",
        code: "missing_required",
        suggestion: "Required — no default",
      }),
    ]
    const output = formatErrors(errors)
    expect(output).toContain("Missing required")
    expect(output).toContain("DATABASE_URL")
    expect(output).toContain("JWT_SECRET")
    expect(output).not.toContain("Invalid")
  })

  it("formats invalid value errors", () => {
    const errors = [
      new ValidationError({
        key: "PORT",
        message: 'Expected a number, received "abc"',
        code: "type_mismatch",
        value: "abc",
      }),
    ]
    const output = formatErrors(errors)
    expect(output).toContain("Invalid")
    expect(output).toContain("PORT")
    expect(output).toContain("Expected a number")
  })

  it("groups missing and invalid separately", () => {
    const errors = [
      new ValidationError({
        key: "MISSING_VAR",
        message: "Missing required environment variable: MISSING_VAR",
        code: "missing_required",
      }),
      new ValidationError({
        key: "INVALID_VAR",
        message: "Invalid value",
        code: "invalid_value",
        value: "bad",
      }),
    ]
    const output = formatErrors(errors)
    expect(output).toContain("Missing required (1)")
    expect(output).toContain("Invalid (1)")
    expect(output).toContain("MISSING_VAR")
    expect(output).toContain("INVALID_VAR")
  })

  it("includes suggestions when present", () => {
    const errors = [
      new ValidationError({
        key: "PORT",
        message: "Invalid port",
        code: "invalid_value",
        value: 99999,
        suggestion: "Did you mean 3000?",
      }),
    ]
    const output = formatErrors(errors)
    expect(output).toContain("Did you mean 3000?")
  })

  it("includes 'Define once' footer", () => {
    const errors = [
      new ValidationError({
        key: "PORT",
        message: "Invalid port",
        code: "invalid_value",
        value: 99999,
      }),
    ]
    const output = formatErrors(errors)
    expect(output).toContain("Define once")
  })
})
