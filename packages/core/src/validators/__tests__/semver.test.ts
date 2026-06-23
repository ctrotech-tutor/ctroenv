import { describe, expect, it } from "vitest"
import { semver } from "../semver"

describe("semver()", () => {
  it("accepts simple semver 1.2.3", () => {
    const result = semver().parse("1.2.3", { key: "VERSION", path: ["VERSION"] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.value).toBe("1.2.3")
  })

  it("accepts major.minor.patch with double digits", () => {
    const result = semver().parse("10.20.30", { key: "VERSION", path: ["VERSION"] })
    expect(result.success).toBe(true)
  })

  it("accepts prerelease: 1.2.3-alpha", () => {
    const result = semver().parse("1.2.3-alpha", { key: "VERSION", path: ["VERSION"] })
    expect(result.success).toBe(true)
  })

  it("accepts prerelease with number: 1.2.3-alpha.1", () => {
    const result = semver().parse("1.2.3-alpha.1", { key: "VERSION", path: ["VERSION"] })
    expect(result.success).toBe(true)
  })

  it("accepts build metadata: 1.2.3+build.1", () => {
    const result = semver().parse("1.2.3+build.1", { key: "VERSION", path: ["VERSION"] })
    expect(result.success).toBe(true)
  })

  it("accepts prerelease + build: 1.2.3-alpha.1+build.2", () => {
    const result = semver().parse("1.2.3-alpha.1+build.2", { key: "VERSION", path: ["VERSION"] })
    expect(result.success).toBe(true)
  })

  it("accepts prerelease with identifiers: 1.2.3-rc.1", () => {
    const result = semver().parse("1.2.3-rc.1", { key: "VERSION", path: ["VERSION"] })
    expect(result.success).toBe(true)
  })

  it("accepts 0.0.0", () => {
    const result = semver().parse("0.0.0", { key: "VERSION", path: ["VERSION"] })
    expect(result.success).toBe(true)
  })

  it("rejects missing patch: 1.2", () => {
    const result = semver().parse("1.2", { key: "VERSION", path: ["VERSION"] })
    expect(result.success).toBe(false)
  })

  it("rejects missing minor and patch: 1", () => {
    const result = semver().parse("1", { key: "VERSION", path: ["VERSION"] })
    expect(result.success).toBe(false)
  })

  it("rejects v prefix: v1.2.3", () => {
    const result = semver().parse("v1.2.3", { key: "VERSION", path: ["VERSION"] })
    expect(result.success).toBe(false)
  })

  it("rejects range: >=1.0.0", () => {
    const result = semver().parse(">=1.0.0", { key: "VERSION", path: ["VERSION"] })
    expect(result.success).toBe(false)
  })

  it("rejects range: ~1.2.0", () => {
    const result = semver().parse("~1.2.0", { key: "VERSION", path: ["VERSION"] })
    expect(result.success).toBe(false)
  })

  it("rejects range: ^1.0.0", () => {
    const result = semver().parse("^1.0.0", { key: "VERSION", path: ["VERSION"] })
    expect(result.success).toBe(false)
  })

  it("rejects non-string input", () => {
    const result = semver().parse(123, { key: "VERSION", path: ["VERSION"] })
    expect(result.success).toBe(false)
  })

  it("rejects empty string", () => {
    const result = semver().parse("", { key: "VERSION", path: ["VERSION"] })
    expect(result.success).toBe(false)
  })

  it("supports .optional() chaining", () => {
    const s = semver().optional()
    expect(s.metadata.optional).toBe(true)
    const result = s.parse("1.0.0", { key: "VERSION", path: ["VERSION"] })
    expect(result.success).toBe(true)
  })

  it("supports .default() chaining", () => {
    const s = semver().default("1.0.0")
    expect(s.metadata.hasDefault).toBe(true)
    expect(s.metadata.defaultValue).toBe("1.0.0")
    const result = s.parse("2.0.0", { key: "VERSION", path: ["VERSION"] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.value).toBe("2.0.0")
  })

  it("supports .describe() chaining", () => {
    const s = semver().describe("Node.js version")
    expect(s.metadata.description).toBe("Node.js version")
  })
})
