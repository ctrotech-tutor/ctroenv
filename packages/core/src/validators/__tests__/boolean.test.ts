import { describe, expect, it } from "vitest"
import { boolean } from "../boolean"

describe("boolean()", () => {
  it("parses true boolean", () => {
    const result = boolean().parse(true, { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.value).toBe(true)
  })

  it("parses false boolean", () => {
    const result = boolean().parse(false, { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.value).toBe(false)
  })

  it("coerces 'true' string", () => {
    const result = boolean().parse("true", { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.value).toBe(true)
  })

  it("coerces 'false' string", () => {
    const result = boolean().parse("false", { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.value).toBe(false)
  })

  it("coerces '1' string", () => {
    const result = boolean().parse("1", { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.value).toBe(true)
  })

  it("coerces '0' string", () => {
    const result = boolean().parse("0", { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.value).toBe(false)
  })

  it("coerces 1 number", () => {
    const result = boolean().parse(1, { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.value).toBe(true)
  })

  it("coerces 0 number", () => {
    const result = boolean().parse(0, { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.value).toBe(false)
  })

  it('accepts "yes"', () => {
    const result = boolean().parse("yes", { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.value).toBe(true)
  })

  it('accepts "no"', () => {
    const result = boolean().parse("no", { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.value).toBe(false)
  })

  it("rejects arbitrary strings", () => {
    const result = boolean().parse("maybe", { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(false)
  })
})
