import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { loadEnv } from "../index"

const TMP = resolve(__dirname, ".tmp-load-env-test")

describe("loadEnv", () => {
  beforeEach(() => {
    rmSync(TMP, { recursive: true, force: true })
    mkdirSync(TMP, { recursive: true })
  })

  afterEach(() => {
    rmSync(TMP, { recursive: true, force: true })
  })

  it("loads a single .env file", () => {
    writeFileSync(
      resolve(TMP, ".env"),
      "DATABASE_URL=postgres://localhost/db\nPORT=3000\n",
      "utf-8",
    )
    const source = loadEnv({ path: TMP })
    expect(source.get("DATABASE_URL")).toBe("postgres://localhost/db")
    expect(source.get("PORT")).toBe("3000")
  })

  it("respects priority: .env.local > .env.development > .env", () => {
    writeFileSync(resolve(TMP, ".env"), "KEY=base\nNODE_ENV=development\n", "utf-8")
    writeFileSync(resolve(TMP, ".env.development"), "KEY=dev\n", "utf-8")
    writeFileSync(resolve(TMP, ".env.local"), "KEY=local\n", "utf-8")
    const source = loadEnv({ path: TMP })
    expect(source.get("KEY")).toBe("local")
  })

  it("returns undefined for missing key", () => {
    const source = loadEnv({ path: TMP })
    expect(source.get("MISSING_KEY")).toBeUndefined()
  })

  it("handles comments and empty lines", () => {
    writeFileSync(
      resolve(TMP, ".env"),
      [
        "# This is a comment",
        "",
        "KEY=value",
        "  # indented comment",
        "ANOTHER=  spaced-value  ",
      ].join("\n"),
      "utf-8",
    )
    const source = loadEnv({ path: TMP })
    expect(source.get("KEY")).toBe("value")
    expect(source.get("ANOTHER")).toBe("spaced-value")
  })

  it("handles quoted values", () => {
    writeFileSync(resolve(TMP, ".env"), ['STRING="hello world"', "CHAR='a'"].join("\n"), "utf-8")
    const source = loadEnv({ path: TMP })
    expect(source.get("STRING")).toBe("hello world")
    expect(source.get("CHAR")).toBe("a")
  })

  it("supports system fallback with system:true", () => {
    writeFileSync(resolve(TMP, ".env"), "KEY=from-env-file\n", "utf-8")
    process.env.__CTROENV_NODE_TEST__ = "from-process"
    const source = loadEnv({ path: TMP, system: true })
    expect(source.get("__CTROENV_NODE_TEST__")).toBe("from-process")
    expect(source.get("KEY")).toBe("from-env-file")
    delete process.env.__CTROENV_NODE_TEST__
  })
})
