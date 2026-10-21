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
      `export const schema = { KEY: { parse: () => ({ success: true, value: null }), metadata: { typeLabel: "string", optional: false, hasDefault: false, isSecret: false } } }`,
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
      `export default { KEY: { parse: () => ({ success: true, value: null }), metadata: { typeLabel: "string", optional: false, hasDefault: false, isSecret: false } } }`,
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
      `export const env = { KEY: { parse: () => ({ success: true, value: null }), metadata: { typeLabel: "string", optional: false, hasDefault: false, isSecret: false } } }`,
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
        server: { DB_URL: { parse: () => ({ success: true, value: null }), metadata: { typeLabel: "string", optional: false, hasDefault: false, isSecret: true } } },
        client: { NEXT_PUBLIC_API: { parse: () => ({ success: true, value: null }), metadata: { typeLabel: "string", optional: false, hasDefault: false, isSecret: false } } },
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

  it("throws when the exported schema is not an object (e.g., string)", async () => {
    const filePath = join(tmpDir, "string-schema.ts")
    writeFileSync(filePath, `export const schema = "not-a-schema-object"`, "utf-8")
    await expect(loadSchema(filePath)).rejects.toThrow(/expected an object of validators/)
  })

  it("throws for a Next.js schema where server is null", async () => {
    const filePath = join(tmpDir, "null-server.ts")
    writeFileSync(
      filePath,
      `export const schema = { server: null, client: { KEY: { parse: () => ({ success: true, value: null }), metadata: { typeLabel: "string" } } } }`,
      "utf-8",
    )
    await expect(loadSchema(filePath)).rejects.toThrow(/entry "server" is not a validator/)
  })

  it("throws for a Next.js schema where client is null", async () => {
    const filePath = join(tmpDir, "null-client.ts")
    writeFileSync(
      filePath,
      `export const schema = { server: { KEY: { parse: () => ({ success: true, value: null }), metadata: { typeLabel: "string" } } }, client: null }`,
      "utf-8",
    )
    // "server" fails first (entry order); the hint names the Next.js shape.
    await expect(loadSchema(filePath)).rejects.toThrow(
      /entry "server" is not a validator.*Next\.js schema/s,
    )
  })

  it("throws when a flat entry looks like a validator but lacks metadata", async () => {
    const filePath = join(tmpDir, "validator-client.ts")
    writeFileSync(
      filePath,
      `export const schema = { server: { KEY: { parse: () => ({ success: true, value: null }), metadata: { typeLabel: "string" } } }, client: { parse: () => "ok" } }`,
      "utf-8",
    )
    // Not a Next.js schema (client has .parse), so "server"/"client" are flat
    // entries — and neither is a validator.
    await expect(loadSchema(filePath)).rejects.toThrow(/is not a validator/)
  })

  it("throws when a flat entry looks like a validator but lacks metadata (server)", async () => {
    const filePath = join(tmpDir, "validator-server.ts")
    writeFileSync(
      filePath,
      `export const schema = { server: { parse: () => "ok" }, client: { KEY: { parse: () => ({ success: true, value: null }), metadata: { typeLabel: "string" } } } }`,
      "utf-8",
    )
    await expect(loadSchema(filePath)).rejects.toThrow(/is not a validator/)
  })

  it("throws a helpful error when the file exports a validated env instead of a schema", async () => {
    const filePath = join(tmpDir, "validated-env.ts")
    writeFileSync(filePath, `export const env = { API_KEY: "abcd", PORT: 3000 }`, "utf-8")
    await expect(loadSchema(filePath)).rejects.toThrow(
      /entry "API_KEY" is not a validator.*validated environment/s,
    )
  })

  it("reloads a changed file with { reload: true }", async () => {
    // .mjs: natively importable on every supported Node (no TS stripping needed).
    const filePath = join(tmpDir, "reloadable.mjs")
    const stub = (key: string) =>
      `export const schema = { ${key}: { parse: () => ({ success: true, value: null }), metadata: {} } }`
    writeFileSync(filePath, stub("BEFORE"), "utf-8")
    const first = await loadSchema(filePath)
    expect(first.BEFORE).toBeDefined()
    writeFileSync(filePath, stub("AFTER"), "utf-8")
    const second = await loadSchema(filePath, { reload: true })
    expect(second.AFTER).toBeDefined()
    expect((second as Record<string, unknown>).BEFORE).toBeUndefined()
  })
})
