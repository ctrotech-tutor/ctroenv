import { describe, expect, it } from "vitest"
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
  })

  describe("email()", () => {
    it("validates email from string validator", () => {
      const v = email()(string())
      expect(v.parse("user@example.com", { key: "TEST", path: ["TEST"] }).success).toBe(true)
      expect(v.parse("not-email", { key: "TEST", path: ["TEST"] }).success).toBe(false)
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
  })

  describe("regex()", () => {
    it("validates pattern from string validator", () => {
      const v = regex(/^api_/)(string())
      expect(v.parse("api_key", { key: "TEST", path: ["TEST"] }).success).toBe(true)
      expect(v.parse("secret", { key: "TEST", path: ["TEST"] }).success).toBe(false)
    })
  })

  describe("integer()", () => {
    it("validates integer from number validator", () => {
      const v = integer()(number())
      expect(v.parse("42", { key: "TEST", path: ["TEST"] }).success).toBe(true)
      expect(v.parse("3.14", { key: "TEST", path: ["TEST"] }).success).toBe(false)
    })
  })
})
