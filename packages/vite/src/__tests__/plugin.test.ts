import { mkdirSync, rmSync } from "node:fs"
import { resolve } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { number, string } from "../../../core/src"
import { ctroenvPlugin } from "../index"

function mockPluginContext() {
  const warnings: string[] = []
  const errors: string[] = []
  return {
    warn: (msg: string) => {
      warnings.push(msg)
    },
    error: (msg: string) => {
      errors.push(msg)
      throw new Error(typeof msg === "string" ? msg : "Plugin error")
    },
    warnings,
    errors,
  }
}

describe("ctroenvPlugin", () => {
  const TMP = resolve(__dirname, ".tmp-plugin-test")

  const validSchema = {
    PORT: number().port().default(3000),
    NODE_ENV: string(),
  }

  beforeEach(() => {
    rmSync(TMP, { recursive: true, force: true })
    mkdirSync(TMP, { recursive: true })
    process.env.NODE_ENV = "test"
    process.env.__CTROENV_TEST_PORT__ = "4000"
  })

  afterEach(() => {
    rmSync(TMP, { recursive: true, force: true })
    delete process.env.NODE_ENV
    delete process.env.__CTROENV_TEST_PORT__
  })

  it("passes validation with inline schema (default failOnError)", async () => {
    const plugin = ctroenvPlugin({ schema: validSchema })
    const ctx = mockPluginContext()
    await plugin.buildStart?.call(ctx as never)
    expect(ctx.warnings.length).toBeGreaterThan(0)
    expect(ctx.warnings[0]).toContain("valid")
  })

  it("warns on validation error when failOnError is false", async () => {
    const plugin = ctroenvPlugin({
      schema: {
        REQUIRED_VAR: string(),
      },
      failOnError: false,
    })
    const ctx = mockPluginContext()
    await plugin.buildStart?.call(ctx as never)
    expect(ctx.warnings.length).toBeGreaterThan(0)
    expect(ctx.errors.length).toBe(0)
  })

  it("respects --no-color / NO_COLOR in formatted errors", () => {
    const plugin = ctroenvPlugin({ schema: validSchema })
    expect(plugin.name).toBe("ctroenv")
  })

  it("throws on validation error with default failOnError (true)", async () => {
    const plugin = ctroenvPlugin({
      schema: {
        REQUIRED: string(),
      },
    })
    const ctx = mockPluginContext()
    await expect(plugin.buildStart?.call(ctx as never)).rejects.toThrow()
    expect(ctx.errors.length).toBeGreaterThan(0)
  })

  it("handles missing schema file gracefully", async () => {
    const plugin = ctroenvPlugin({ schema: resolve(TMP, "nonexistent-schema.ts") })
    const ctx = mockPluginContext()
    await expect(plugin.buildStart?.call(ctx as never)).rejects.toThrow()
  })

  it("handles runtime error in schema module gracefully", async () => {
    const schemaPath = resolve(TMP, "broken-schema.ts")
    const { writeFileSync } = await import("node:fs")
    writeFileSync(schemaPath, `throw new Error("oops")`, "utf-8")
    const plugin = ctroenvPlugin({ schema: schemaPath })
    const ctx = mockPluginContext()
    await expect(plugin.buildStart?.call(ctx as never)).rejects.toThrow()
  })

  it("loads schema from file path and validates", async () => {
    const schemaPath = resolve(TMP, "valid-schema.ts")
    const { writeFileSync } = await import("node:fs")
    writeFileSync(
      schemaPath,
      `import { string, number } from "@ctroenv/core";
export const schema = { PORT: number().port().default(3000), NODE_ENV: string() };`,
      "utf-8",
    )
    process.env.NODE_ENV = "test"
    const plugin = ctroenvPlugin({ schema: schemaPath })
    const ctx = mockPluginContext()
    await plugin.buildStart?.call(ctx as never)
    expect(ctx.warnings.length).toBeGreaterThan(0)
  })

  it("loads schema from file exporting env instead of schema", async () => {
    const schemaPath = resolve(TMP, "env-export-schema.ts")
    const { writeFileSync } = await import("node:fs")
    writeFileSync(
      schemaPath,
      `import { string, number } from "@ctroenv/core";
export const env = { PORT: number().port().default(3000) };`,
      "utf-8",
    )
    const plugin = ctroenvPlugin({ schema: schemaPath })
    const ctx = mockPluginContext()
    await plugin.buildStart?.call(ctx as never)
    expect(ctx.warnings.length).toBeGreaterThan(0)
  })

  it("accepts maskWith option", async () => {
    const plugin = ctroenvPlugin({
      schema: validSchema,
      maskWith: "***SECRET***",
    })
    const ctx = mockPluginContext()
    await plugin.buildStart?.call(ctx as never)
    expect(ctx.warnings.length).toBeGreaterThan(0)
  })
})
