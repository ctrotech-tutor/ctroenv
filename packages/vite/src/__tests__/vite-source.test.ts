import { beforeEach, describe, expect, it } from "vitest"
import { viteSource } from "../index"

describe("viteSource", () => {
  const KEY = "__CTROENV_TEST_VITE__"

  beforeEach(() => {
    delete process.env[KEY]
  })

  it("falls back to process.env when import.meta.env unavailable", () => {
    process.env[KEY] = "from-process"
    const source = viteSource()
    expect(source.get(KEY)).toBe("from-process")
  })

  it("returns undefined for missing key", () => {
    const source = viteSource()
    expect(source.get(KEY)).toBeUndefined()
  })
})
