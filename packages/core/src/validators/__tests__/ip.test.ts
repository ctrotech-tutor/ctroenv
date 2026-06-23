import { describe, expect, it } from "vitest"
import { ip, ipv4, ipv6 } from "../ip"

describe("ip()", () => {
  it("accepts IPv4: 192.168.1.1", () => {
    const result = ip().parse("192.168.1.1", { key: "HOST", path: ["HOST"] })
    expect(result.success).toBe(true)
  })

  it("accepts IPv4: 0.0.0.0", () => {
    const result = ip().parse("0.0.0.0", { key: "HOST", path: ["HOST"] })
    expect(result.success).toBe(true)
  })

  it("accepts IPv4: 255.255.255.255", () => {
    const result = ip().parse("255.255.255.255", { key: "HOST", path: ["HOST"] })
    expect(result.success).toBe(true)
  })

  it("accepts IPv6: ::1", () => {
    const result = ip().parse("::1", { key: "HOST", path: ["HOST"] })
    expect(result.success).toBe(true)
  })

  it("accepts IPv6: 2001:db8::1", () => {
    const result = ip().parse("2001:db8::1", { key: "HOST", path: ["HOST"] })
    expect(result.success).toBe(true)
  })

  it("accepts IPv6: fe80::1", () => {
    const result = ip().parse("fe80::1", { key: "HOST", path: ["HOST"] })
    expect(result.success).toBe(true)
  })

  it("accepts IPv6: ::ffff:192.0.2.1 (IPv4-mapped)", () => {
    const result = ip().parse("::ffff:192.0.2.1", { key: "HOST", path: ["HOST"] })
    expect(result.success).toBe(true)
  })

  it("rejects IPv4 with invalid octet: 256.1.2.3", () => {
    const result = ip().parse("256.1.2.3", { key: "HOST", path: ["HOST"] })
    expect(result.success).toBe(false)
  })

  it("rejects IPv4 with leading zero: 192.168.01.1", () => {
    const result = ip().parse("192.168.01.1", { key: "HOST", path: ["HOST"] })
    expect(result.success).toBe(false)
  })

  it("rejects IPv4 with double leading zero: 192.168.00.1", () => {
    const result = ip().parse("192.168.00.1", { key: "HOST", path: ["HOST"] })
    expect(result.success).toBe(false)
  })

  it("rejects hostname: localhost", () => {
    const result = ip().parse("localhost", { key: "HOST", path: ["HOST"] })
    expect(result.success).toBe(false)
  })

  it("rejects link-local IPv6 with zone index", () => {
    const result = ip().parse("fe80::1%eth0", { key: "HOST", path: ["HOST"] })
    expect(result.success).toBe(false)
  })

  it("rejects empty string", () => {
    const result = ip().parse("", { key: "HOST", path: ["HOST"] })
    expect(result.success).toBe(false)
  })

  it("rejects non-string input", () => {
    const result = ip().parse(123, { key: "HOST", path: ["HOST"] })
    expect(result.success).toBe(false)
  })

  describe("ip({ version: '4' })", () => {
    it("accepts IPv4", () => {
      const result = ip({ version: "4" }).parse("10.0.0.1", { key: "HOST", path: ["HOST"] })
      expect(result.success).toBe(true)
    })

    it("rejects IPv6", () => {
      const result = ip({ version: "4" }).parse("::1", { key: "HOST", path: ["HOST"] })
      expect(result.success).toBe(false)
    })
  })

  describe("ip({ version: '6' })", () => {
    it("accepts IPv6", () => {
      const result = ip({ version: "6" }).parse("::1", { key: "HOST", path: ["HOST"] })
      expect(result.success).toBe(true)
    })

    it("rejects IPv4", () => {
      const result = ip({ version: "6" }).parse("192.168.1.1", { key: "HOST", path: ["HOST"] })
      expect(result.success).toBe(false)
    })
  })

  describe("ipv4() convenience", () => {
    it("accepts IPv4", () => {
      const result = ipv4().parse("10.0.0.1", { key: "HOST", path: ["HOST"] })
      expect(result.success).toBe(true)
    })

    it("rejects IPv6", () => {
      const result = ipv4().parse("::1", { key: "HOST", path: ["HOST"] })
      expect(result.success).toBe(false)
    })
  })

  describe("ipv6() convenience", () => {
    it("accepts IPv6", () => {
      const result = ipv6().parse("::1", { key: "HOST", path: ["HOST"] })
      expect(result.success).toBe(true)
    })

    it("rejects IPv4", () => {
      const result = ipv6().parse("192.168.1.1", { key: "HOST", path: ["HOST"] })
      expect(result.success).toBe(false)
    })
  })
})
