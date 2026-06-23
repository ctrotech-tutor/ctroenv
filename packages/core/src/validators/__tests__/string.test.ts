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

    it("propagates base validator failure", () => {
      const s = string().url()
      const result = s.parse(123, { key: "TEST", path: ["TEST"] })
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

    it("propagates base validator failure", () => {
      const result = string()
        .email()
        .parse(123, { key: "TEST", path: ["TEST"] })
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

    it("propagates base validator failure", () => {
      const result = string()
        .port()
        .parse(123, { key: "TEST", path: ["TEST"] })
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

    it("propagates base validator failure", () => {
      const result = string()
        .min(3)
        .parse(123, { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })

  describe(".max()", () => {
    it("rejects strings longer than max", () => {
      const result = string()
        .max(3)
        .parse("abcdef", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })

    it("propagates base validator failure", () => {
      const result = string()
        .max(3)
        .parse(123, { key: "TEST", path: ["TEST"] })
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

    it("propagates base validator failure", () => {
      const result = string()
        .regex(/^api_/)
        .parse(123, { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })

  describe(".hostname()", () => {
    it("accepts simple hostname", () => {
      const result = string()
        .hostname()
        .parse("localhost", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(true)
    })

    it("accepts domain", () => {
      const result = string()
        .hostname()
        .parse("example.com", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(true)
    })

    it("accepts subdomain", () => {
      const result = string()
        .hostname()
        .parse("api.example.com", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(true)
    })

    it("accepts FQDN with trailing dot", () => {
      const result = string()
        .hostname()
        .parse("example.com.", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(true)
    })

    it("accepts hostname with hyphens", () => {
      const result = string()
        .hostname()
        .parse("my-service.internal", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(true)
    })

    it("rejects hostname with underscore", () => {
      const result = string()
        .hostname()
        .parse("bad_host", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })

    it("rejects hostname with spaces", () => {
      const result = string()
        .hostname()
        .parse("bad host", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })

    it("rejects empty string", () => {
      const result = string()
        .hostname()
        .parse("", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })

    it("rejects label with leading hyphen", () => {
      const result = string()
        .hostname()
        .parse("-bad.example.com", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })

    it("rejects label with trailing hyphen", () => {
      const result = string()
        .hostname()
        .parse("bad-.example.com", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })

    it("rejects hostname too long (>253 chars)", () => {
      const long = "a".repeat(254)
      const result = string()
        .hostname()
        .parse(long, { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })

    it("rejects label too long (>63 chars)", () => {
      const long = `${"a".repeat(64)}.com`
      const result = string()
        .hostname()
        .parse(long, { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })

    it("rejects label with invalid characters", () => {
      const result = string()
        .hostname()
        .parse("a_b.example.com", { key: "TEST", path: ["TEST"] })
      expect(result.success).toBe(false)
    })
  })
})
