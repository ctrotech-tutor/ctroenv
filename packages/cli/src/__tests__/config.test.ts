import { mkdtempSync, realpathSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { loadConfigFile, resolveConfig } from "../utils/config"

const FIXTURES = resolve(__dirname, "fixtures")

describe("resolveConfig", () => {
  let tmpDir: string

  afterEach(() => {
    tmpDir = ""
  })

  it("loads config from ctroenv.json", () => {
    const config = resolveConfig(resolve(FIXTURES, "basic"))
    expect(config.schema).toBe("env.ts")
    expect(config.sources.default).toBe(".env")
  })

  it("uses defaults for minimal fixture (no config file)", () => {
    const config = resolveConfig(resolve(FIXTURES, "minimal"))
    expect(config.schema).toBe("src/env.ts")
    expect(config.output.example).toBe(".env.example")
    expect(config.output.docs).toBe("ENVIRONMENT.md")
  })

  it("overrides schema with provided value", () => {
    const config = resolveConfig(FIXTURES, { schema: "custom.ts" })
    expect(config.schema).toBe("custom.ts")
  })

  it("merges sources from overrides", () => {
    const config = resolveConfig(FIXTURES, { sources: { production: ".prod.env" } })
    expect(config.sources.default).toBe(".env")
    expect(config.sources.production).toBe(".prod.env")
  })

  it("secrets defaults to empty mask", () => {
    const config = resolveConfig(resolve(FIXTURES, "minimal"))
    expect(config.secrets.mask).toEqual([])
    expect(config.secrets.maskWith).toBe("***")
  })

  it("handles non-existent config directory gracefully", () => {
    const config = resolveConfig(resolve(FIXTURES, "nonexistent"))
    expect(config.schema).toBe("src/env.ts")
  })

  it("returns null for corrupt JSON config file", () => {
    tmpDir = realpathSync(mkdtempSync(join(tmpdir(), "ctroenv-corrupt-")))
    writeFileSync(join(tmpDir, "ctroenv.json"), `{ invalid json }`, "utf-8")
    expect(loadConfigFile(tmpDir)).toBeNull()
  })

  it("loads config via jiti for .ts config file", () => {
    tmpDir = realpathSync(mkdtempSync(join(tmpdir(), "ctroenv-config-")))
    writeFileSync(
      join(tmpDir, "ctroenv.config.ts"),
      `export default { schema: "custom.ts", secrets: { mask: ["SECRET_KEY"], maskWith: "###" } }`,
      "utf-8",
    )
    const config = resolveConfig(tmpDir)
    expect(config.schema).toBe("custom.ts")
    expect(config.secrets.mask).toEqual(["SECRET_KEY"])
    expect(config.secrets.maskWith).toBe("###")
  })
})
