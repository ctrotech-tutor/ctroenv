import { describe, expect, it, vi } from "vitest"
import { number } from "../number"
import { string } from "../string"

describe("chainable methods", () => {
  describe(".optional()", () => {
    it("marks validator as optional", () => {
      const v = string().optional()
      expect(v.metadata.optional).toBe(true)
      expect(v.metadata.hasDefault).toBe(false)
    })

    it("still parses valid values", () => {
      const result = string()
        .optional()
        .parse("hello", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(true)
    })
  })

  describe(".default()", () => {
    it("sets default value in metadata", () => {
      const v = string().default("localhost")
      expect(v.metadata.hasDefault).toBe(true)
      expect(v.metadata.defaultValue).toBe("localhost")
    })

    it("marks as not optional", () => {
      const v = string().default("localhost")
      expect(v.metadata.optional).toBe(false)
    })

    it("parses provided values", () => {
      const result = string()
        .default("localhost")
        .parse("0.0.0.0", { key: "HOST", path: ["HOST"] })
      expect(result.success).toBe(true)
      if (result.success) expect(result.value).toBe("0.0.0.0")
    })
  })

  describe(".describe()", () => {
    it("sets description in metadata", () => {
      const v = string().describe("The database connection URL")
      expect(v.metadata.description).toBe("The database connection URL")
    })
  })

  describe(".secret()", () => {
    it("marks as secret", () => {
      const v = string().secret()
      expect(v.metadata.isSecret).toBe(true)
    })
  })

  describe(".default() with validation", () => {
    it("warns in dev mode when default fails refinements", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
      const prev = process.env.NODE_ENV
      process.env.NODE_ENV = "development"

      string().url().default("not-a-url")

      expect(warn).toHaveBeenCalledOnce()
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("[ctroenv] Default value"))

      warn.mockRestore()
      process.env.NODE_ENV = prev
    })

    it("does not warn when default passes refinements", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
      const prev = process.env.NODE_ENV
      process.env.NODE_ENV = "development"

      string().url().default("https://valid.com")

      expect(warn).not.toHaveBeenCalled()

      warn.mockRestore()
      process.env.NODE_ENV = prev
    })

    it("does not warn in production", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
      const prev = process.env.NODE_ENV
      process.env.NODE_ENV = "production"

      string().url().default("not-a-url")

      expect(warn).not.toHaveBeenCalled()

      warn.mockRestore()
      process.env.NODE_ENV = prev
    })
  })

  describe(".validate()", () => {
    it("accepts valid custom validation", () => {
      const v = string().validate((val) =>
        val.startsWith("api_") ? undefined : "Must start with 'api_'",
      )
      const result = v.parse("api_key", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(true)
    })

    it("rejects invalid custom validation", () => {
      const v = string().validate((val) =>
        val.startsWith("api_") ? undefined : "Must start with 'api_'",
      )
      const result = v.parse("secret", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })

    it("propagates base validator failure", () => {
      const v = string().validate(() => undefined)
      const result = v.parse(123, { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })

  describe("refinement composition", () => {
    const ctx = { key: "TEST", path: ["TEST"] }

    it("applies every chained string refinement, not just the last", () => {
      const v = string().url().min(1)
      expect(v.parse("not-a-url-at-all", ctx).success).toBe(false)
      expect(v.parse("https://example.com", ctx).success).toBe(true)
    })

    it("applies stacked min/max refinements", () => {
      const v = string().min(5).max(8)
      expect(v.parse("ab", ctx).success).toBe(false)
      expect(v.parse("abcdefghi", ctx).success).toBe(false)
      expect(v.parse("abcdef", ctx).success).toBe(true)
    })

    it("applies stacked number refinements", () => {
      const v = number().int().positive().min(10).max(20)
      expect(v.parse("5", ctx).success).toBe(false)
      expect(v.parse("25", ctx).success).toBe(false)
      expect(v.parse("12.5", ctx).success).toBe(false)
      expect(v.parse("15", ctx).success).toBe(true)
    })

    it("supports branching from a mid-chain validator", () => {
      const base = string().min(2)
      const short = base.max(5)
      const long = base.max(10)
      expect(short.parse("abcdef", ctx).success).toBe(false)
      expect(short.parse("abc", ctx).success).toBe(true)
      expect(long.parse("abcdef", ctx).success).toBe(true)
      expect(long.parse("x", ctx).success).toBe(false)
    })

    it("chains specific refinements after generic methods", () => {
      const v = string().secret().describe("s").min(5)
      expect(v.parse("ab", ctx).success).toBe(false)
      expect(v.parse("abcdef", ctx).success).toBe(true)
      expect(v.metadata.isSecret).toBe(true)
      expect(v.metadata.description).toBe("s")
    })

    it("chains generic methods between specific refinements", () => {
      const v = string().min(2).secret().max(5)
      expect(v.parse("x", ctx).success).toBe(false)
      expect(v.parse("abcdef", ctx).success).toBe(false)
      expect(v.parse("abc", ctx).success).toBe(true)
      expect(v.metadata.isSecret).toBe(true)
    })

    it("keeps specific methods and metadata through .default() and .validate()", () => {
      const v = number()
        .default(15)
        .validate((n) => (n % 2 === 0 ? undefined : "must be even"))
        .min(10)
        .max(20)
      expect(v.parse("9", ctx).success).toBe(false)
      expect(v.parse("21", ctx).success).toBe(false)
      expect(v.parse("13", ctx).success).toBe(false)
      expect(v.parse("14", ctx).success).toBe(true)
      expect(v.metadata.hasDefault).toBe(true)
      expect(v.metadata.defaultValue).toBe(15)
    })

    it(".optional() ends the specific chain (widens T, like Zod)", () => {
      const v = string().min(2).optional()
      expect("min" in v).toBe(false)
      expect("url" in v).toBe(false)
      // Generic methods still available.
      expect(typeof v.secret).toBe("function")
      expect(typeof v.describe).toBe("function")
      // Earlier refinements still enforced.
      expect(v.parse("x", ctx).success).toBe(false)
      expect(v.parse("abc", ctx).success).toBe(true)
    })

    it(".optional() after generic methods stays generic", () => {
      const v = string().secret().optional()
      expect("min" in v).toBe(false)
      expect(v.metadata.isSecret).toBe(true)
      expect(v.metadata.optional).toBe(true)
    })
  })
})
