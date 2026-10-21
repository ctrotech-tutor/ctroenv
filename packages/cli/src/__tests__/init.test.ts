import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { initCommand } from "../commands/init"
import { ExitCode } from "../exit-codes"

const TMP = resolve(__dirname, ".tmp-init-test")

describe("init command", () => {
  beforeEach(() => {
    rmSync(TMP, { recursive: true, force: true })
    mkdirSync(TMP, { recursive: true })
  })

  afterEach(() => {
    rmSync(TMP, { recursive: true, force: true })
  })

  it("creates ctroenv.config.ts by default", async () => {
    const code = await initCommand({
      format: "ts",
      minimal: false,
      cwd: TMP,
    })
    expect(code).toBe(ExitCode.Success)
    const filePath = resolve(TMP, "ctroenv.config.ts")
    expect(existsSync(filePath)).toBe(true)
    const content = readFileSync(filePath, "utf-8")
    expect(content).toContain("defineConfig")
    expect(content).toContain(".env.example")
  })

  it("creates minimal config when --minimal", async () => {
    const code = await initCommand({
      format: "ts",
      minimal: true,
      cwd: TMP,
    })
    expect(code).toBe(ExitCode.Success)
    const content = readFileSync(resolve(TMP, "ctroenv.config.ts"), "utf-8")
    expect(content).toContain("defineConfig")
    expect(content).not.toContain(".env.example")
  })

  it("creates JS config when --js", async () => {
    const code = await initCommand({
      format: "js",
      minimal: false,
      cwd: TMP,
    })
    expect(code).toBe(ExitCode.Success)
    const filePath = resolve(TMP, "ctroenv.config.js")
    expect(existsSync(filePath)).toBe(true)
  })

  it("creates JSON config when --json", async () => {
    const code = await initCommand({
      format: "json",
      minimal: false,
      cwd: TMP,
    })
    expect(code).toBe(ExitCode.Success)
    const filePath = resolve(TMP, "ctroenv.json")
    expect(existsSync(filePath)).toBe(true)
    const content = readFileSync(filePath, "utf-8")
    const parsed = JSON.parse(content)
    expect(parsed.schema).toBe("./src/env.ts")
    expect(parsed.sources).toBeDefined()
  })

  it("creates minimal JSON config with --json --minimal", async () => {
    const code = await initCommand({
      format: "json",
      minimal: true,
      cwd: TMP,
    })
    expect(code).toBe(ExitCode.Success)
    const content = readFileSync(resolve(TMP, "ctroenv.json"), "utf-8")
    const parsed = JSON.parse(content)
    expect(parsed.schema).toBe("./src/env.ts")
    expect(parsed.sources).toBeUndefined()
  })

  it("generates schema from --from-env", async () => {
    const envPath = resolve(TMP, ".env.local")
    writeFileSync(envPath, "DATABASE_URL=postgres://localhost/db\nPORT=4000\n", "utf-8")

    const code = await initCommand({
      format: "ts",
      minimal: false,
      cwd: TMP,
      fromEnv: ".env.local",
    })

    expect(code).toBe(ExitCode.Success)
    const schemaPath = resolve(TMP, "src", "env.ts")
    expect(existsSync(schemaPath)).toBe(true)
    const content = readFileSync(schemaPath, "utf-8")
    expect(content).toContain("DATABASE_URL")
    expect(content).toContain("PORT")
  })

  it("returns ConfigError when --from-env file not found", async () => {
    const code = await initCommand({
      format: "ts",
      minimal: false,
      cwd: TMP,
      fromEnv: "nonexistent.env",
    })

    expect(code).toBe(ExitCode.ConfigError)
  })

  it("handles --from-env with mixed valid vars and parse errors", async () => {
    const envPath = resolve(TMP, ".env.local")
    writeFileSync(
      envPath,
      "DATABASE_URL=postgres://localhost/db\nINVALID_LINE_NO_EQUALS\nPORT=4000\n",
      "utf-8",
    )

    const code = await initCommand({
      format: "ts",
      minimal: false,
      cwd: TMP,
      fromEnv: ".env.local",
    })

    expect(code).toBe(ExitCode.Success)
    const content = readFileSync(resolve(TMP, "src", "env.ts"), "utf-8")
    expect(content).toContain("DATABASE_URL")
    expect(content).toContain("PORT")
  })

  it("returns ConfigError when schema file cannot be written from --from-env", async () => {
    const envPath = resolve(TMP, ".env.local")
    writeFileSync(envPath, "DATABASE_URL=postgres://localhost/db\n", "utf-8")
    writeFileSync(resolve(TMP, "src"), "i am a file not a directory", "utf-8")

    const code = await initCommand({
      format: "ts",
      minimal: false,
      cwd: TMP,
      fromEnv: ".env.local",
    })

    expect(code).toBe(ExitCode.ConfigError)
  })

  it("returns ConfigError when config file cannot be written", async () => {
    rmSync(TMP, { recursive: true, force: true })
    writeFileSync(TMP, "i am a file not a directory", "utf-8")

    const code = await initCommand({
      format: "ts",
      minimal: false,
      cwd: TMP,
    })

    expect(code).toBe(ExitCode.ConfigError)
  })

  it("refuses to overwrite an existing config file without --force", async () => {
    const filePath = resolve(TMP, "ctroenv.config.ts")
    writeFileSync(filePath, "// precious user config\n", "utf-8")

    const code = await initCommand({ format: "ts", minimal: true, cwd: TMP })

    expect(code).toBe(ExitCode.ConfigError)
    expect(readFileSync(filePath, "utf-8")).toBe("// precious user config\n")
  })

  it("refuses to overwrite an existing src/env.ts from --from-env without --force", async () => {
    writeFileSync(resolve(TMP, ".env"), "PORT=4000\n", "utf-8")
    const schemaPath = resolve(TMP, "src", "env.ts")
    mkdirSync(resolve(TMP, "src"), { recursive: true })
    writeFileSync(schemaPath, "// precious user schema\n", "utf-8")

    const code = await initCommand({
      format: "ts",
      minimal: false,
      cwd: TMP,
      fromEnv: ".env",
    })

    expect(code).toBe(ExitCode.ConfigError)
    expect(readFileSync(schemaPath, "utf-8")).toBe("// precious user schema\n")
  })

  it("overwrites existing files with --force", async () => {
    const configPath = resolve(TMP, "ctroenv.config.ts")
    writeFileSync(configPath, "// old\n", "utf-8")
    writeFileSync(resolve(TMP, ".env"), "PORT=4000\n", "utf-8")
    const schemaPath = resolve(TMP, "src", "env.ts")
    mkdirSync(resolve(TMP, "src"), { recursive: true })
    writeFileSync(schemaPath, "// old\n", "utf-8")

    expect(await initCommand({ format: "ts", minimal: true, cwd: TMP, force: true })).toBe(
      ExitCode.Success,
    )
    expect(readFileSync(configPath, "utf-8")).toContain("defineConfig")
    expect(
      await initCommand({ format: "ts", minimal: false, cwd: TMP, fromEnv: ".env", force: true }),
    ).toBe(ExitCode.Success)
    expect(readFileSync(schemaPath, "utf-8")).toContain("export const schema")
  })
})
