import { afterAll, describe, expect, it } from "vitest"
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
      const source = detectSource()
      expect(typeof source.get("MODE")).toBe("string")
    })

    it("falls back to process.env when key is not in import.meta.env", () => {
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

  describe("Deno detection", () => {
    const originalDeno = (globalThis as Record<string, unknown>).Deno

    afterAll(() => {
      if (originalDeno === undefined) {
        delete (globalThis as Record<string, unknown>).Deno
      } else {
        ;(globalThis as Record<string, unknown>).Deno = originalDeno
      }
    })

    it("reads from Deno.env.get when Deno global exists", () => {
      ;(globalThis as Record<string, unknown>).Deno = {
        env: { get: () => "deno-value" },
      }
      const source = detectSource()
      expect(source.get("ANY_KEY")).toBe("deno-value")
    })

    it("falls through to process.env when Deno.env.get returns undefined", () => {
      ;(globalThis as Record<string, unknown>).Deno = {
        env: { get: () => undefined },
      }
      const source = detectSource()
      expect(source.get("PATH")).toBeDefined()
    })
  })

  describe("Bun detection", () => {
    const originalBun = (globalThis as Record<string, unknown>).Bun

    afterAll(() => {
      if (originalBun === undefined) {
        delete (globalThis as Record<string, unknown>).Bun
      } else {
        ;(globalThis as Record<string, unknown>).Bun = originalBun
      }
    })

    it("reads from Bun.env when Bun global exists", () => {
      ;(globalThis as Record<string, unknown>).Bun = {
        env: { BUN_VAR: "bun-value" },
      }
      const source = detectSource()
      expect(source.get("BUN_VAR")).toBe("bun-value")
    })

    it("falls through when Bun.env does not contain the key", () => {
      ;(globalThis as Record<string, unknown>).Bun = {
        env: {},
      }
      const source = detectSource()
      expect(source.get("PATH")).toBeDefined()
    })

    it("returns undefined for missing key in all sources", () => {
      const source = detectSource()
      expect(source.get("__CTROENV_UTTERLY_NONEXISTENT__")).toBeUndefined()
    })
  })
})
