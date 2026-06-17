import { describe, expect, it } from "vitest"
import { detectSource, objectSource } from "../../define-env/source"

describe("EnvSource", () => {
  describe("objectSource()", () => {
    it("reads values from plain object", () => {
      const source = objectSource({ DATABASE_URL: "postgres://localhost/mydb" })
      expect(source.get("DATABASE_URL")).toBe("postgres://localhost/mydb")
    })

    it("returns undefined for missing keys", () => {
      const source = objectSource({})
      expect(source.get("MISSING")).toBeUndefined()
    })
  })

  describe("detectSource()", () => {
    it("detects process.env in Node", () => {
      const source = detectSource()
      expect(source.get("PATH")).toBeDefined()
    })

    it("prefers import.meta.env when both sources are available", () => {
      // In vitest, both process.env and import.meta.env are available.
      // import.meta.env should be checked first.
      const source = detectSource()
      // MODE is a standard vitest/Vite import.meta.env var
      expect(typeof source.get("MODE")).toBe("string")
    })

    it("falls back to process.env when key is not in import.meta.env", () => {
      // PATH is a process.env var that's not in import.meta.env
      const source = detectSource()
      const originalPath = process.env.PATH
      process.env.PATH = "/test/path"
      try {
        expect(source.get("PATH")).toBe("/test/path")
      } finally {
        process.env.PATH = originalPath
      }
    })
  })
})
