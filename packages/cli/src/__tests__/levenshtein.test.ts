import { describe, expect, it } from "vitest"
import { levenshtein, suggestKey } from "../utils/levenshtein"

describe("levenshtein()", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("hello", "hello")).toBe(0)
  })

  it("returns length for empty vs non-empty", () => {
    expect(levenshtein("", "abc")).toBe(3)
    expect(levenshtein("abc", "")).toBe(3)
  })

  it("calculates single substitution", () => {
    expect(levenshtein("cat", "car")).toBe(1)
  })

  it("calculates single insertion", () => {
    expect(levenshtein("cat", "cats")).toBe(1)
  })

  it("calculates single deletion", () => {
    expect(levenshtein("cats", "cat")).toBe(1)
  })

  it("calculates complex distance", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3)
  })
})

describe("suggestKey()", () => {
  it("returns exact match when within distance", () => {
    const result = suggestKey("DATABASE_URL", ["DATABASE_URL", "PORT"])
    expect(result).toBe("DATABASE_URL")
  })

  it("returns close match for typo", () => {
    const result = suggestKey("DATABASE__URL", ["DATABASE_URL", "PORT"])
    expect(result).toBe("DATABASE_URL")
  })

  it("returns null when no close match", () => {
    const result = suggestKey("COMPLETELY_DIFFERENT", ["PORT", "HOST"])
    expect(result).toBeNull()
  })

  it("returns null for empty known keys", () => {
    const result = suggestKey("KEY", [])
    expect(result).toBeNull()
  })

  it("considers case when calculating levenshtein distance", () => {
    expect(levenshtein("PORT", "port")).toBe(4)
    expect(levenshtein("PORT", "PORT")).toBe(0)
  })

  it("returns null when only case-different match exists beyond maxDistance", () => {
    const result = suggestKey("port", ["PORT", "HOST"])
    expect(result).toBeNull()
  })
})
