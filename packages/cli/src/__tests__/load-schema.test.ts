import { mkdtempSync, realpathSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { loadSchema } from "../utils/load-schema"

describe("loadSchema", () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = realpathSync(mkdtempSync(join(tmpdir(), "ctroenv-load-schema-")))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("loads schema that exports a schema named export", async () => {
    const filePath = join(tmpDir, "env.ts")
    writeFileSync(
      filePath,
      `export const schema = { KEY: { metadata: { typeLabel: "string", optional: false, hasDefault: false, isSecret: false } } }`,
      "utf-8",
    )
    const schema = await loadSchema(filePath)
    expect(schema.KEY).toBeDefined()
    expect(schema.KEY.metadata.typeLabel).toBe("string")
  })

  it("loads schema that exports default", async () => {
    const filePath = join(tmpDir, "env-default.ts")
    writeFileSync(
      filePath,
      `export default { KEY: { metadata: { typeLabel: "string", optional: false, hasDefault: false, isSecret: false } } }`,
      "utf-8",
    )
    const schema = await loadSchema(filePath)
    expect(schema.KEY).toBeDefined()
    expect(schema.KEY.metadata.typeLabel).toBe("string")
  })

  it("loads schema that exports env", async () => {
    const filePath = join(tmpDir, "env-export.ts")
    writeFileSync(
      filePath,
      `export const env = { KEY: { metadata: { typeLabel: "string", optional: false, hasDefault: false, isSecret: false } } }`,
      "utf-8",
    )
    const schema = await loadSchema(filePath)
    expect(schema.KEY).toBeDefined()
    expect(schema.KEY.metadata.typeLabel).toBe("string")
  })

  it("throws when schema file cannot be loaded", async () => {
    await expect(loadSchema(join(tmpDir, "nonexistent.ts"))).rejects.toThrow()
  })
})
