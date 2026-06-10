import { describe, expect, it } from "vitest"
import { hello, version } from "./index"

describe("@ctroenv/core", () => {
  it("exports version", () => {
    expect(version).toBe("0.0.0")
  })

  it("exports hello", () => {
    expect(hello()).toBe("ctroenv/core — Define once. Trust everywhere.")
  })
})
