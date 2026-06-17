import { describe, expect, it } from "vitest"
import { CtroEnvError } from "../ctroenv-error"
import { ValidationError } from "../validation-error"

describe("CtroEnvError", () => {
  it("stores errors array", () => {
    const errors = [
      new ValidationError({ key: "PORT", message: "Missing", code: "missing_required" }),
    ]
    const err = new CtroEnvError(errors)
    expect(err.errors).toHaveLength(1)
    expect(err.errors[0].key).toBe("PORT")
  })

  it("sets name to CtroEnvError", () => {
    const err = new CtroEnvError([])
    expect(err.name).toBe("CtroEnvError")
  })

  it("is instance of Error", () => {
    const err = new CtroEnvError([])
    expect(err).toBeInstanceOf(Error)
  })

  it("is instance of CtroEnvError", () => {
    const err = new CtroEnvError([])
    expect(err).toBeInstanceOf(CtroEnvError)
  })

  it("message contains formatted errors", () => {
    const errors = [
      new ValidationError({ key: "PORT", message: "Missing", code: "missing_required" }),
    ]
    const err = new CtroEnvError(errors)
    expect(err.message).toContain("PORT")
    expect(err.message).toContain("Missing")
  })
})
