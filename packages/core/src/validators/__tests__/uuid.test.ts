import { describe, expect, it } from "vitest"
import { guid, uuid } from "../uuid"

describe("uuid()", () => {
  it("accepts UUIDv4", () => {
    const result = uuid().parse("550e8400-e29b-41d4-a716-446655440000", { key: "ID", path: ["ID"] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.value).toBe("550e8400-e29b-41d4-a716-446655440000")
  })

  it("accepts UUIDv1", () => {
    const result = uuid().parse("123e4567-e89b-12d3-a456-426614174000", { key: "ID", path: ["ID"] })
    expect(result.success).toBe(true)
  })

  it("accepts UUIDv7", () => {
    const result = uuid().parse("018e0e00-9e4b-7b3c-9a1e-123456789abc", { key: "ID", path: ["ID"] })
    expect(result.success).toBe(true)
  })

  it("accepts nil UUID", () => {
    const result = uuid().parse("00000000-0000-0000-0000-000000000000", { key: "ID", path: ["ID"] })
    expect(result.success).toBe(true)
  })

  it("rejects invalid variant bits", () => {
    // Variant bits at position 19 must be 8, 9, a, or b
    // Setting to '0' here makes it invalid
    const result = uuid().parse("550e8400-e29b-41d4-0716-446655440000", { key: "ID", path: ["ID"] })
    expect(result.success).toBe(false)
  })

  it("rejects non-hex character in last segment", () => {
    const result = uuid().parse("550e8400-e29b-41d4-a716-44665544000z", { key: "ID", path: ["ID"] })
    expect(result.success).toBe(false)
  })

  it("rejects string without hyphens", () => {
    const result = uuid().parse("550e8400e29b41d4a716446655440000", { key: "ID", path: ["ID"] })
    expect(result.success).toBe(false)
  })

  it("rejects uppercase but .parse is case-insensitive", () => {
    const result = uuid().parse("550E8400-E29B-41D4-A716-446655440000", { key: "ID", path: ["ID"] })
    expect(result.success).toBe(true)
  })

  it("rejects empty string", () => {
    const result = uuid().parse("", { key: "ID", path: ["ID"] })
    expect(result.success).toBe(false)
  })

  it("rejects non-string input", () => {
    const result = uuid().parse(123, { key: "ID", path: ["ID"] })
    expect(result.success).toBe(false)
  })

  describe("uuid({ version: '4' })", () => {
    it("accepts UUIDv4", () => {
      const result = uuid({ version: "4" }).parse("550e8400-e29b-41d4-a716-446655440000", {
        key: "ID",
        path: ["ID"],
      })
      expect(result.success).toBe(true)
    })

    it("rejects UUIDv1", () => {
      const result = uuid({ version: "4" }).parse("123e4567-e89b-12d3-a456-426614174000", {
        key: "ID",
        path: ["ID"],
      })
      expect(result.success).toBe(false)
    })
  })

  describe("uuid({ version: '7' })", () => {
    it("accepts UUIDv7", () => {
      const result = uuid({ version: "7" }).parse("018e0e00-9e4b-7b3c-9a1e-123456789abc", {
        key: "ID",
        path: ["ID"],
      })
      expect(result.success).toBe(true)
    })

    it("rejects UUIDv4", () => {
      const result = uuid({ version: "7" }).parse("550e8400-e29b-41d4-a716-446655440000", {
        key: "ID",
        path: ["ID"],
      })
      expect(result.success).toBe(false)
    })
  })
})

describe("guid()", () => {
  it("accepts any 8-4-4-4-12 hex pattern", () => {
    const result = guid().parse("550e8400-e29b-41d4-a716-446655440000", { key: "ID", path: ["ID"] })
    expect(result.success).toBe(true)
  })

  it("accepts UUIDv4 with different variant bits", () => {
    // GUID doesn't validate variant bits, so 0xxx is OK
    const result = guid().parse("550e8400-e29b-41d4-0716-446655440000", { key: "ID", path: ["ID"] })
    expect(result.success).toBe(true)
  })

  it("accepts nil UUID", () => {
    const result = guid().parse("00000000-0000-0000-0000-000000000000", { key: "ID", path: ["ID"] })
    expect(result.success).toBe(true)
  })

  it("rejects non-hex characters", () => {
    const result = guid().parse("550e8400-e29b-41d4-a716-44665544000z", { key: "ID", path: ["ID"] })
    expect(result.success).toBe(false)
  })

  it("rejects too few segments", () => {
    const result = guid().parse("550e8400-e29b-41d4-a716", { key: "ID", path: ["ID"] })
    expect(result.success).toBe(false)
  })
})
