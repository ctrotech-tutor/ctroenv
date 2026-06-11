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
  })
})
