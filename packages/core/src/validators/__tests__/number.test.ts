import { describe, expect, it } from "vitest"
import { number } from "../number"

describe("number()", () => {
  it("parses numeric strings", () => {
    const result = number().parse("3000", { key: "PORT", path: ["PORT"] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.value).toBe(3000)
  })

  it("parses actual numbers", () => {
    const result = number().parse(42, { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.value).toBe(42)
  })

  it("rejects non-numeric strings", () => {
    const result = number().parse("abc", { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(false)
  })

  it("rejects hex notation", () => {
    const result = number().parse("0xFF", { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(false)
  })

  it("rejects scientific notation", () => {
    const result = number().parse("1e2", { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(false)
  })

  it("rejects whitespace-only strings", () => {
    const result = number().parse("   ", { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(false)
  })

  it("rejects NaN", () => {
    const result = number().parse(NaN, { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(false)
  })

  it("rejects Infinity", () => {
    const result = number().parse(Infinity, { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(false)
  })

  it("rejects undefined", () => {
    const result = number().parse(undefined, { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(false)
  })

  describe(".int()", () => {
    it("accepts integer", () => {
      const result = number()
        .int()
        .parse("42", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(true)
    })

    it("rejects float", () => {
      const result = number()
        .int()
        .parse("3.14", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })

  describe(".positive()", () => {
    it("accepts positive number", () => {
      const result = number()
        .positive()
        .parse("10", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(true)
    })

    it("rejects zero", () => {
      const result = number()
        .positive()
        .parse("0", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })

    it("rejects negative", () => {
      const result = number()
        .positive()
        .parse("-5", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })

  describe(".port()", () => {
    it("accepts 1", () => {
      const result = number()
        .port()
        .parse("1", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(true)
    })

    it("accepts 65535", () => {
      const result = number()
        .port()
        .parse("65535", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(true)
    })

    it("rejects 0", () => {
      const result = number()
        .port()
        .parse("0", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })

    it("rejects 70000", () => {
      const result = number()
        .port()
        .parse("70000", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })

  describe(".min()", () => {
    it("rejects below minimum", () => {
      const result = number()
        .min(10)
        .parse("5", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })

  describe(".max()", () => {
    it("rejects above maximum", () => {
      const result = number()
        .max(10)
        .parse("15", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })
})
