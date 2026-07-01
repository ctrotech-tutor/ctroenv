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

  it("throws on second nonexistent file (cached jiti)", async () => {
    await expect(loadSchema(join(tmpDir, "also-nonexistent.ts"))).rejects.toThrow()
  })

  it("flattens client/server (Next.js) schema into single object", async () => {
    const filePath = join(tmpDir, "csr-env.ts")
    writeFileSync(
      filePath,
      `export const schema = {
        server: { DB_URL: { metadata: { typeLabel: "string", optional: false, hasDefault: false, isSecret: true } } },
        client: { NEXT_PUBLIC_API: { metadata: { typeLabel: "string", optional: false, hasDefault: false, isSecret: false } } },
      }`,
      "utf-8",
    )
    const schema = await loadSchema(filePath)
    expect(schema.DB_URL).toBeDefined()
    expect(schema.NEXT_PUBLIC_API).toBeDefined()
  })

  it("tries jiti when native import fails with non-relative path", async () => {
    const filePath = join(tmpDir, "bad-format.ts")
    writeFileSync(filePath, `throw new Error("simulated native import failure")`, "utf-8")
    await expect(loadSchema(filePath)).rejects.toThrow()
  })

  it("handles schema where exported schema is not an object (e.g., string)", async () => {
    const filePath = join(tmpDir, "string-schema.ts")
    writeFileSync(filePath, `export const schema = "not-a-schema-object"`, "utf-8")
    const schema = await loadSchema(filePath)
    expect(schema).toBe("not-a-schema-object")
  })

  it("handles Next.js schema where server is null", async () => {
    const filePath = join(tmpDir, "null-server.ts")
    writeFileSync(
      filePath,
      `export const schema = { server: null, client: { KEY: { metadata: { typeLabel: "string" } } } }`,
      "utf-8",
    )
    const schema = await loadSchema(filePath)
    expect(schema.server).toBeNull()
    expect((schema as Record<string, unknown>).client).toBeDefined()
  })

  it("handles Next.js schema where client is null", async () => {
    const filePath = join(tmpDir, "null-client.ts")
    writeFileSync(
      filePath,
      `export const schema = { server: { KEY: { metadata: { typeLabel: "string" } } }, client: null }`,
      "utf-8",
    )
    const schema = await loadSchema(filePath)
    expect((schema as Record<string, unknown>).server).toBeDefined()
    expect(schema.client).toBeNull()
  })

  it("handles schema where client has .parse function (not Next.js schema)", async () => {
    const filePath = join(tmpDir, "validator-client.ts")
    writeFileSync(
      filePath,
      `export const schema = { server: { KEY: { metadata: { typeLabel: "string" } } }, client: { parse: () => "ok" } }`,
      "utf-8",
    )
    const schema = await loadSchema(filePath)
    expect((schema as Record<string, unknown>).server).toBeDefined()
    expect((schema as Record<string, unknown>).client).toBeDefined()
  })

  it("handles schema where server has .parse function (not Next.js schema)", async () => {
    const filePath = join(tmpDir, "validator-server.ts")
    writeFileSync(
      filePath,
      `export const schema = { server: { parse: () => "ok" }, client: { KEY: { metadata: { typeLabel: "string" } } } }`,
      "utf-8",
    )
    const schema = await loadSchema(filePath)
    // Falls through to flat schema: both server and client become schema keys
    expect(schema.server).toBeDefined()
    expect(schema.client).toBeDefined()
  })
})
