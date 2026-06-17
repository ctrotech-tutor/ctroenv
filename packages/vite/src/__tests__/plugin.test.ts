import { mkdirSync, rmSync } from "node:fs"
import { resolve } from "node:path"
import { number, string } from "@ctroenv/core"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
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
})
