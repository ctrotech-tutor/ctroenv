import { describe, expect, it, vi } from "vitest"
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
  })
})
