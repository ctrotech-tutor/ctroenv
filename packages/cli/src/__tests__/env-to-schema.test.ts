import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { generateSchemaFromEnv } from "../utils/env-to-schema"

const TMP = resolve(__dirname, ".tmp-env-to-schema")

describe("generateSchemaFromEnv", () => {
  beforeEach(() => {
    rmSync(TMP, { recursive: true, force: true })
    mkdirSync(TMP, { recursive: true })
  })

  afterEach(() => {
    rmSync(TMP, { recursive: true, force: true })
  })

  it("generates schema from env file", () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(envPath, "DATABASE_URL=postgres://localhost/db\nPORT=4000\n", "utf-8")

    const result = generateSchemaFromEnv(envPath)

    expect(result.errors).toHaveLength(0)
    expect(result.fileCount).toBe(2)
    expect(result.code).toContain("defineEnv")
    expect(result.code).toContain("DATABASE_URL: string()")
    expect(result.code).toContain("PORT: number()")
  })

  it("infers boolean type", () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(envPath, "DEBUG=true\nFEATURE_FLAG=yes\n", "utf-8")

    const result = generateSchemaFromEnv(envPath)

    expect(result.code).toContain("DEBUG: boolean()")
    expect(result.code).toContain("FEATURE_FLAG: boolean()")
  })

  it("handles comments", () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(envPath, "# Database config\nDATABASE_URL=postgres://localhost/db\n", "utf-8")

    const result = generateSchemaFromEnv(envPath)

    expect(result.code).toContain("// Database config")
    expect(result.code).toContain("DATABASE_URL: string()")
  })

  it("handles quoted values", () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(envPath, 'GREETING="hello world"\n', "utf-8")

    const result = generateSchemaFromEnv(envPath)

    expect(result.code).toContain("GREETING: string()")
  })

  it("handles empty lines", () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(envPath, "\n\nKEY=value\n\n", "utf-8")

    const result = generateSchemaFromEnv(envPath)

    expect(result.fileCount).toBe(1)
    expect(result.errors).toHaveLength(0)
  })

  it("reports file not found error", () => {
    const envPath = resolve(TMP, "nonexistent.env")

    const result = generateSchemaFromEnv(envPath)

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain("File not found")
    expect(result.fileCount).toBe(0)
  })

  it("reports no variables found for empty file", () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(envPath, "", "utf-8")

    const result = generateSchemaFromEnv(envPath)

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toBe("No environment variables found in file")
    expect(result.code).toBe("")
  })

  it("handles lines without = sign", () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(envPath, "KEY=value\nmalformed-line\nOTHER=val\n", "utf-8")

    const result = generateSchemaFromEnv(envPath)

    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]).toContain('no "=" found')
    expect(result.fileCount).toBe(2)
  })

  it("handles reserved word keys", () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(envPath, "class=foo\nreturn=bar\n", "utf-8")

    const result = generateSchemaFromEnv(envPath)

    expect(result.code).toContain('"class": string()')
    expect(result.code).toContain('"return": string()')
  })

  it("handles special characters in keys", () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(envPath, "MY-KEY=value\n123START=bad\n", "utf-8")

    const result = generateSchemaFromEnv(envPath)

    expect(result.code).toContain('"MY-KEY": string()')
    expect(result.code).toContain('"123START": string()')
  })

  it("handles comments after blank lines (resets comment)", () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(envPath, "# First section\nKEY1=val1\n\nKEY2=val2\n", "utf-8")

    const result = generateSchemaFromEnv(envPath)

    const commentIndex = result.code.indexOf("// First section")
    const key1Index = result.code.indexOf("KEY1: string()")
    const key2Index = result.code.indexOf("KEY2: string()")
    expect(commentIndex).toBeGreaterThan(-1)
    expect(key1Index).toBeGreaterThan(commentIndex)
    expect(key2Index).toBeGreaterThan(key1Index)
  })

  it("omits comments for blank comments (# with no text)", () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(envPath, "#\nKEY=val\n", "utf-8")

    const result = generateSchemaFromEnv(envPath)

    expect(result.code).not.toContain("//")
    expect(result.code).toContain("KEY: string()")
  })

  it("reports parse errors but still returns code when some vars found", () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(envPath, "GOOD=value\nBAD_LINE\n", "utf-8")

    const result = generateSchemaFromEnv(envPath)

    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.fileCount).toBe(1)
    expect(result.code).toContain("GOOD: string()")
  })
})
