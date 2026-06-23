import { describe, expect, it } from "vitest"
import { workersSource } from "../workers"

describe("workersSource()", () => {
  it("reads values from passed env object", () => {
    const source = workersSource({ MY_VAR: "hello" })
    expect(source.get("MY_VAR")).toBe("hello")
  })

  it("returns undefined for missing keys", () => {
    const source = workersSource({ EXISTING: "value" })
    expect(source.get("MISSING")).toBeUndefined()
  })
})
