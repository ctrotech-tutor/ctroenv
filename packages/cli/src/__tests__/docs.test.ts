import { readFileSync, writeFileSync } from "node:fs"
import { mkdtempSync, realpathSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { docsCommand } from "../commands/docs"
import { ExitCode } from "../exit-codes"

function createSchema(): import("@ctroenv/core").SchemaDefinition {
  return {
    DATABASE_URL: {
      parse: () => ({ success: true, value: "" }),
      metadata: {
        typeLabel: "url",
        optional: false,
        hasDefault: false,
        defaultValue: undefined,
        description: "Postgres connection string",
        isSecret: false,
      },
    },
    PORT: {
      parse: () => ({ success: true, value: 0 }),
      metadata: {
        typeLabel: "number",
        optional: true,
        hasDefault: true,
        defaultValue: 3000,
        description: "Server port",
        isSecret: false,
      },
    },
    JWT_SECRET: {
      parse: () => ({ success: true, value: "" }),
      metadata: {
        typeLabel: "string",
        optional: false,
        hasDefault: false,
        defaultValue: undefined,
        description: undefined,
        isSecret: true,
      },
    },
  } as unknown as import("@ctroenv/core").SchemaDefinition
}

describe("docsCommand", () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = realpathSync(mkdtempSync(join(tmpdir(), "ctroenv-docs-test-")))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("generates markdown output", async () => {
    const outputPath = join(tmpDir, "ENVIRONMENT.md")
    const exitCode = await docsCommand({ schema: createSchema(), output: outputPath, format: "markdown" })
    expect(exitCode).toBe(ExitCode.Success)
    const content = readFileSync(outputPath, "utf-8")
    expect(content).toContain("# Environment Variables Reference")
    expect(content).toContain("## DATABASE_URL")
    expect(content).toContain("url")
    expect(content).toContain("## PORT")
    expect(content).toContain("3000")
    expect(content).toContain("## JWT_SECRET")
    expect(content).toContain("(masked in output)")
  })

  it("generates JSON output", async () => {
    const outputPath = join(tmpDir, "env.json")
    const exitCode = await docsCommand({ schema: createSchema(), output: outputPath, format: "json" })
    expect(exitCode).toBe(ExitCode.Success)
    const content = JSON.parse(readFileSync(outputPath, "utf-8"))
    expect(content.count).toBe(3)
    expect(content.variables[0].key).toBe("DATABASE_URL")
    expect(content.variables[0].required).toBe(true)
    expect(content.variables[2].isSecret).toBe(true)
  })

  it("includes description when present", async () => {
    const outputPath = join(tmpDir, "ENVIRONMENT.md")
    const exitCode = await docsCommand({ schema: createSchema(), output: outputPath, format: "markdown" })
    expect(exitCode).toBe(ExitCode.Success)
    const content = readFileSync(outputPath, "utf-8")
    expect(content).toContain("Postgres connection string")
  })

  it("returns error for unwritable path", async () => {
    const exitCode = await docsCommand({
      schema: createSchema(),
      output: "/nonexistent/dir/ENVIRONMENT.md",
      format: "markdown",
    })
    expect(exitCode).toBe(ExitCode.ConfigError)
  })
})
