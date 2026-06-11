import { beforeEach, describe, expect, it } from "vitest"
import { nodeSource } from "../index"

const KEY = "__CTROENV_TEST_NODE__"

describe("nodeSource", () => {
  beforeEach(() => {
    delete process.env[KEY]
  })

  it("reads from process.env", () => {
    process.env[KEY] = "test-value"
    const source = nodeSource()
    expect(source.get(KEY)).toBe("test-value")
  })

  it("returns undefined for missing key", () => {
    const source = nodeSource()
    expect(source.get(KEY)).toBeUndefined()
  })
})
