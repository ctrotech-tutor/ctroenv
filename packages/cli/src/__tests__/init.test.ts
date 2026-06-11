import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs"
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
})
