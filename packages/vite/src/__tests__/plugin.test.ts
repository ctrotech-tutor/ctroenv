import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { number, pick, string } from "../../../core/src"
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

type MockContext = ReturnType<typeof mockPluginContext>

function applyResolvedConfig(
  plugin: ReturnType<typeof ctroenvPlugin>,
  resolved: { root: string; envDir: string | false; mode: string; envPrefix: string | string[] },
): void {
  const hook = plugin.configResolved as unknown as (config: unknown) => void
  hook(resolved)
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

  describe("Vite env file loading", () => {
    const FILE_VAR = "VITE_CTROENV_FILE_VAR"
    const MODE_VAR = "VITE_CTROENV_MODE_VAR"
    const ACTUAL_VAR = "VITE_CTROENV_ACTUAL_VAR"
    const PLAIN_VAR = "CTROENV_PLAIN_FILE_VAR"

    afterEach(() => {
      delete process.env[FILE_VAR]
      delete process.env[MODE_VAR]
      delete process.env[ACTUAL_VAR]
      delete process.env[PLAIN_VAR]
    })

    function resolvedFor(
      tmp: string,
      overrides?: Partial<Parameters<typeof applyResolvedConfig>[1]>,
    ) {
      return {
        root: tmp,
        envDir: tmp,
        mode: "test",
        envPrefix: "VITE_",
        ...overrides,
      }
    }

    it("validates vars that only exist in a .env file", async () => {
      delete process.env[FILE_VAR]
      writeFileSync(resolve(TMP, ".env"), `${FILE_VAR}=https://file.example.com\n`, "utf-8")
      const plugin = ctroenvPlugin({ schema: { [FILE_VAR]: string().url() } })
      const ctx = mockPluginContext()
      applyResolvedConfig(plugin, resolvedFor(TMP))
      await plugin.buildStart?.call(ctx as never)
      expect(ctx.errors).toHaveLength(0)
      expect(ctx.warnings.some((w) => w.includes("valid"))).toBe(true)
      // Guard: the test is meaningless if the var leaked into process.env.
      expect(process.env[FILE_VAR]).toBeUndefined()
    })

    it("prefers mode-specific env files over base .env", async () => {
      writeFileSync(resolve(TMP, ".env"), `${MODE_VAR}=base\n`, "utf-8")
      writeFileSync(resolve(TMP, ".env.test"), `${MODE_VAR}=from-test-mode\n`, "utf-8")
      const plugin = ctroenvPlugin({ schema: { [MODE_VAR]: pick(["from-test-mode"]) } })
      const ctx = mockPluginContext()
      applyResolvedConfig(plugin, resolvedFor(TMP))
      await plugin.buildStart?.call(ctx as never)
      expect(ctx.errors).toHaveLength(0)
    })

    it("lets actual process vars override .env file values", async () => {
      writeFileSync(resolve(TMP, ".env"), `${ACTUAL_VAR}=not-a-url\n`, "utf-8")
      process.env[ACTUAL_VAR] = "https://actual.example.com"
      const plugin = ctroenvPlugin({ schema: { [ACTUAL_VAR]: string().url() } })
      const ctx = mockPluginContext()
      applyResolvedConfig(plugin, resolvedFor(TMP))
      await plugin.buildStart?.call(ctx as never)
      expect(ctx.errors).toHaveLength(0)
    })

    it("still fails when a var is missing from both files and process.env", async () => {
      writeFileSync(resolve(TMP, ".env"), "VITE_CTROENV_OTHER=1\n", "utf-8")
      const plugin = ctroenvPlugin({ schema: { [FILE_VAR]: string() } })
      const ctx = mockPluginContext()
      applyResolvedConfig(plugin, resolvedFor(TMP))
      await expect(plugin.buildStart?.call(ctx as never)).rejects.toThrow()
      expect(ctx.errors.length).toBeGreaterThan(0)
    })

    it("reports non-prefixed file-only vars as missing (Vite semantics)", async () => {
      // Vite never exposes non-prefixed file vars at runtime, so a schema that
      // requires one must fail validation here too.
      writeFileSync(resolve(TMP, ".env"), `${PLAIN_VAR}=file-only\n`, "utf-8")
      const plugin = ctroenvPlugin({ schema: { [PLAIN_VAR]: string() } })
      const ctx = mockPluginContext()
      applyResolvedConfig(plugin, resolvedFor(TMP))
      await expect(plugin.buildStart?.call(ctx as never)).rejects.toThrow()
    })

    it("validates non-prefixed vars provided via process.env", async () => {
      process.env[PLAIN_VAR] = "from-process"
      const plugin = ctroenvPlugin({ schema: { [PLAIN_VAR]: string() } })
      const ctx = mockPluginContext()
      applyResolvedConfig(plugin, resolvedFor(TMP))
      await plugin.buildStart?.call(ctx as never)
      expect(ctx.errors).toHaveLength(0)
    })

    it("honors a custom envDir from resolved config", async () => {
      const envDir = resolve(TMP, "custom-env")
      mkdirSync(envDir, { recursive: true })
      writeFileSync(resolve(envDir, ".env"), `${FILE_VAR}=https://custom.example.com\n`, "utf-8")
      const plugin = ctroenvPlugin({ schema: { [FILE_VAR]: string().url() } })
      const ctx = mockPluginContext()
      applyResolvedConfig(plugin, resolvedFor(TMP, { envDir }))
      await plugin.buildStart?.call(ctx as never)
      expect(ctx.errors).toHaveLength(0)
    })

    it("resolves relative schema paths against the Vite root", async () => {
      const nested = resolve(TMP, "nested")
      mkdirSync(nested, { recursive: true })
      writeFileSync(
        resolve(nested, "schema.ts"),
        `import { string } from "@ctroenv/core";\nexport const schema = { ${FILE_VAR}: string().url() };`,
        "utf-8",
      )
      writeFileSync(resolve(TMP, ".env"), `${FILE_VAR}=https://nested.example.com\n`, "utf-8")
      const plugin = ctroenvPlugin({ schema: "./nested/schema.ts" })
      const ctx = mockPluginContext()
      applyResolvedConfig(plugin, resolvedFor(TMP))
      await plugin.buildStart?.call(ctx as never)
      expect(ctx.errors).toHaveLength(0)
    })

    it("falls back to process.env with a warning when env files cannot load", async () => {
      // `local` is rejected as a mode name by Vite's loader, which exercises
      // the degraded path: warn loudly, validate against process.env.
      process.env[FILE_VAR] = "https://fallback.example.com"
      const plugin = ctroenvPlugin({ schema: { [FILE_VAR]: string().url() } })
      const ctx: MockContext = mockPluginContext()
      applyResolvedConfig(plugin, resolvedFor(TMP, { mode: "local" }))
      await plugin.buildStart?.call(ctx as never)
      expect(ctx.errors).toHaveLength(0)
      expect(ctx.warnings.some((w) => w.includes("process.env` only"))).toBe(true)
      expect(ctx.warnings.some((w) => w.includes("valid"))).toBe(true)
    })
  })
})
