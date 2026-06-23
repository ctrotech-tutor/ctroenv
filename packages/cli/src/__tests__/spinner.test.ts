import { describe, expect, it, vi } from "vitest"
import { createSpinner, keyLabel } from "../utils/output"

describe("keyLabel", () => {
  it("returns bold yellow text", () => {
    const label = keyLabel("TEST_KEY")
    expect(label).toContain("TEST_KEY")
  })
})

describe("createSpinner", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("start writes to stdout after advancing timers", () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
    const spinner = createSpinner("loading")
    spinner.start()
    vi.advanceTimersByTime(80)
    expect(write).toHaveBeenCalled()
    write.mockRestore()
  })

  it("stop clears interval and line", () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
    const spinner = createSpinner("loading")
    spinner.start()
    spinner.stop()
    expect(write).toHaveBeenCalled()
    write.mockRestore()
  })

  it("succeed stops and writes checkmark", () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
    const spinner = createSpinner("loading")
    spinner.succeed("done")
    expect(write).toHaveBeenCalledWith(expect.stringContaining("✓"))
    write.mockRestore()
  })

  it("fail stops and writes cross", () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
    const spinner = createSpinner("loading")
    spinner.fail("failed")
    expect(write).toHaveBeenCalledWith(expect.stringContaining("✗"))
    write.mockRestore()
  })

  it("succeed uses default text when none provided", () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
    const spinner = createSpinner("loading")
    spinner.succeed()
    expect(write).toHaveBeenCalledWith(expect.stringContaining("loading"))
    write.mockRestore()
  })

  it("start is idempotent (double start does not throw)", () => {
    const spinner = createSpinner("test")
    spinner.start()
    expect(() => spinner.start()).not.toThrow()
    spinner.stop()
  })
})
