import { describe, expect, it } from "vitest"
import { string } from "../string"

describe("string()", () => {
  it("parses valid strings", () => {
    const result = string().parse("hello", { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.value).toBe("hello")
  })

  it("rejects numbers", () => {
    const result = string().parse(123, { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(false)
  })

  it("rejects undefined when required", () => {
    const result = string().parse(undefined, { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.errors[0].code).toBe("type_mismatch")
  })

  it("rejects null", () => {
    const result = string().parse(null, { key: "TEST", path: ["TEST"] })
    expect(result.success).toBe(false)
  })

  describe(".url()", () => {
    it("accepts https://example.com", () => {
      const s = string().url()
      const result = s.parse("https://example.com", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(true)
    })

    it("rejects not-a-url", () => {
      const s = string().url()
      const result = s.parse("not-a-url", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })

    it("rejects URL without protocol", () => {
      const s = string().url()
      const result = s.parse("example.com", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })

    it("rejects file protocol", () => {
      const s = string().url()
      const result = s.parse("file:///etc/passwd", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })

  describe(".email()", () => {
    it("accepts valid email", () => {
      const result = string()
        .email()
        .parse("user@example.com", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(true)
    })

    it("rejects invalid email", () => {
      const result = string()
        .email()
        .parse("not-an-email", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })

  describe(".port()", () => {
    it("accepts valid port", () => {
      const result = string()
        .port()
        .parse("3000", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(true)
    })

    it("rejects invalid port", () => {
      const result = string()
        .port()
        .parse("99999", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })

  describe(".min()", () => {
    it("rejects strings shorter than min", () => {
      const result = string()
        .min(5)
        .parse("abc", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })

    it("accepts strings at min length", () => {
      const result = string()
        .min(3)
        .parse("abc", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(true)
    })
  })

  describe(".max()", () => {
    it("rejects strings longer than max", () => {
      const result = string()
        .max(3)
        .parse("abcdef", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })

  describe(".regex()", () => {
    it("accepts matching pattern", () => {
      const result = string()
        .regex(/^api_/)
        .parse("api_key", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(true)
    })

    it("rejects non-matching pattern", () => {
      const result = string()
        .regex(/^api_/)
        .parse("secret_key", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })
})
