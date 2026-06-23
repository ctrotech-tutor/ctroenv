import { describe, expect, it } from "vitest"
import { boolean } from "../../boolean"
import { number } from "../../number"
import { string } from "../../string"
import { email, integer, max, min, port, regex, url } from "../index"

describe("refinements", () => {
  describe("url()", () => {
    it("validates URL from string validator", () => {
      const v = url()(string())
      expect(v.parse("https://example.com", { key: "TEST", path: ["TEST"] }).success).toBe(true)
      expect(v.parse("not-url", { key: "TEST", path: ["TEST"] }).success).toBe(false)
    })

    it("rejects file:// URLs", () => {
      const v = url()(string())
      expect(v.parse("file:///etc/passwd", { key: "TEST", path: ["TEST"] }).success).toBe(false)
    })

    it("propagates inner validator failure", () => {
      const v = url()(string())
      const result = v.parse(123, { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })

  describe("email()", () => {
    it("validates email from string validator", () => {
      const v = email()(string())
      expect(v.parse("user@example.com", { key: "TEST", path: ["TEST"] }).success).toBe(true)
      expect(v.parse("not-email", { key: "TEST", path: ["TEST"] }).success).toBe(false)
    })

    it("propagates inner validator failure", () => {
      const v = email()(string())
      const result = v.parse(123, { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })

  describe("port()", () => {
    it("validates port from string validator", () => {
      const v = port()(string())
      expect(v.parse("3000", { key: "TEST", path: ["TEST"] }).success).toBe(true)
      expect(v.parse("99999", { key: "TEST", path: ["TEST"] }).success).toBe(false)
    })

    it("validates port from number validator", () => {
      const v = port()(number())
      expect(v.parse("3000", { key: "TEST", path: ["TEST"] }).success).toBe(true)
      expect(v.parse("0", { key: "TEST", path: ["TEST"] }).success).toBe(false)
    })

    it("propagates inner validator failure", () => {
      const v = port()(string())
      const result = v.parse(123, { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })

  describe("min()", () => {
    it("works with string validator (length)", () => {
      const v = min(3)(string())
      expect(v.parse("abc", { key: "TEST", path: ["TEST"] }).success).toBe(true)
      expect(v.parse("ab", { key: "TEST", path: ["TEST"] }).success).toBe(false)
    })

    it("works with number validator (value)", () => {
      const v = min(10)(number())
      expect(v.parse("15", { key: "TEST", path: ["TEST"] }).success).toBe(true)
      expect(v.parse("5", { key: "TEST", path: ["TEST"] }).success).toBe(false)
    })

    it("propagates inner validator failure", () => {
      const v = min(3)(string())
      const result = v.parse(123, { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })

  describe("max()", () => {
    it("works with string validator (length)", () => {
      const v = max(5)(string())
      expect(v.parse("hello", { key: "TEST", path: ["TEST"] }).success).toBe(true)
      expect(v.parse("abcdef", { key: "TEST", path: ["TEST"] }).success).toBe(false)
    })

    it("works with number validator (value)", () => {
      const v = max(10)(number())
      expect(v.parse("5", { key: "TEST", path: ["TEST"] }).success).toBe(true)
      expect(v.parse("15", { key: "TEST", path: ["TEST"] }).success).toBe(false)
    })

    it("propagates inner validator failure", () => {
      const v = max(5)(string())
      const result = v.parse(123, { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })

  describe("regex()", () => {
    it("validates pattern from string validator", () => {
      const v = regex(/^api_/)(string())
      expect(v.parse("api_key", { key: "TEST", path: ["TEST"] }).success).toBe(true)
      expect(v.parse("secret", { key: "TEST", path: ["TEST"] }).success).toBe(false)
    })

    it("uses custom message when provided", () => {
      const v = regex(/^[A-Z]+$/, "Must be uppercase")(string())
      const result = v.parse("abc", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0].message).toBe("Must be uppercase")
      }
    })

    it("propagates inner validator failure", () => {
      const v = regex(/^api_/)(string())
      const result = v.parse(123, { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })

  describe("integer()", () => {
    it("validates integer from number validator", () => {
      const v = integer()(number())
      expect(v.parse("42", { key: "TEST", path: ["TEST"] }).success).toBe(true)
      expect(v.parse("3.14", { key: "TEST", path: ["TEST"] }).success).toBe(false)
    })

    it("propagates inner validator failure", () => {
      const v = integer()(number())
      const result = v.parse("not-a-number", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })

  describe("type-agnostic fallback", () => {
    it("max() accepts non-number, non-string values (boolean)", () => {
      const v = max(5)(boolean())
      expect(v.parse(true, { key: "TEST", path: ["TEST"] }).success).toBe(true)
    })

    it("min() accepts non-number, non-string values (boolean)", () => {
      const v = min(3)(boolean())
      expect(v.parse(true, { key: "TEST", path: ["TEST"] }).success).toBe(true)
    })
  })
})
