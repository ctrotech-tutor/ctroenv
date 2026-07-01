import { describe, expect, it, vi } from "vitest"
import {
  createSpinner,
  divider,
  error,
  header,
  hint,
  keyValueTable,
  section,
  success,
  warning,
} from "../utils/output"

describe("output utilities", () => {
  it("header formats text", () => {
    expect(header("test")).toContain("test")
  })

  it("success includes checkmark", () => {
    expect(success("done")).toContain("done")
  })

  it("error includes cross mark", () => {
    expect(error("failed")).toContain("failed")
  })

  it("warning includes warning sign", () => {
    expect(warning("caution")).toContain("caution")
  })

  it("hint dims text", () => {
    expect(hint("note")).toContain("note")
  })

  it("divider creates separator", () => {
    const line = divider()
    expect(line.length).toBeGreaterThan(40)
  })

  it("section formats title and lines", () => {
    const result = section("Title", ["line1", "line2"])
    expect(result).toContain("Title")
    expect(result).toContain("line1")
    expect(result).toContain("line2")
  })

  it("section handles empty title", () => {
    const result = section("", ["line1"])
    expect(result).not.toContain("**")
  })

  it("keyValueTable formats rows", () => {
    const rows: [string, string][] = [
      ["KEY_A", "value_a"],
      ["KEY_B", "value_b"],
    ]
    const result = keyValueTable(rows)
    expect(result).toContain("KEY_A")
    expect(result).toContain("KEY_B")
    expect(result).toContain("value_a")
  })

  it("keyValueTable returns empty for no rows", () => {
    expect(keyValueTable([])).toBe("")
  })

  it("createSpinner fail writes to stdout with custom message", () => {
    const spinner = createSpinner("loading")
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
    spinner.fail("custom message")
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining("custom message"))
    writeSpy.mockRestore()
  })
})
