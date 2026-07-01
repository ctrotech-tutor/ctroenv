import { beforeEach, describe, expect, it, vi } from "vitest"
import { viteSource } from "../index"

describe("viteSource", () => {
  const KEY = "__CTROENV_TEST_VITE__"

  beforeEach(() => {
    delete process.env[KEY]
  })

  it("reads from import.meta.env when key exists", () => {
    const source = viteSource()
    expect(typeof source.get("MODE")).toBe("string")
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

  it("returns undefined when process is unavailable", () => {
    vi.stubGlobal("process", undefined)
    const source = viteSource()
    expect(source.get(KEY)).toBeUndefined()
    vi.unstubAllGlobals()
  })
})
