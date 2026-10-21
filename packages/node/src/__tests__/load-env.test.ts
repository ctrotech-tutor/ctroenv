import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { loadEnv } from "../index"

const TMP = resolve(__dirname, ".tmp-load-env-test")

function withNodeEnv(value: string | undefined, fn: () => void): void {
  const prev = process.env.NODE_ENV
  try {
    if (value === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = value
    fn()
  } finally {
    if (prev === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = prev
  }
}

function withNativeLoader(impl: () => void, fn: (mock: ReturnType<typeof vi.fn>) => void): void {
  const proc = process as unknown as Record<string, unknown>
  const original = proc.loadEnvFile
  const mock = vi.fn(impl)
  proc.loadEnvFile = mock
  try {
    fn(mock)
  } finally {
    proc.loadEnvFile = original
  }
}

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
    writeFileSync(resolve(TMP, ".env"), "KEY=base\n", "utf-8")
    writeFileSync(resolve(TMP, ".env.development"), "KEY=dev\n", "utf-8")
    writeFileSync(resolve(TMP, ".env.local"), "KEY=local\n", "utf-8")
    withNodeEnv("development", () => {
      expect(loadEnv({ path: TMP }).get("KEY")).toBe("local")
    })
    rmSync(resolve(TMP, ".env.local"))
    withNodeEnv("development", () => {
      // The middle layer must genuinely load — not be masked by .env.local.
      expect(loadEnv({ path: TMP }).get("KEY")).toBe("dev")
    })
  })

  it("reads NODE_ENV at call time for the environment-specific file", () => {
    writeFileSync(resolve(TMP, ".env"), "KEY=base\n", "utf-8")
    writeFileSync(resolve(TMP, ".env.staging"), "KEY=staging\n", "utf-8")
    withNodeEnv("staging", () => {
      expect(loadEnv({ path: TMP }).get("KEY")).toBe("staging")
    })
    withNodeEnv("other", () => {
      expect(loadEnv({ path: TMP }).get("KEY")).toBe("base")
    })
  })

  it("loads just that file when path points at a file", () => {
    writeFileSync(resolve(TMP, ".env"), "KEY=wrong\nDIR_ONLY=yes\n", "utf-8")
    const custom = resolve(TMP, "custom.env")
    writeFileSync(custom, "KEY=from-file\n", "utf-8")
    const source = loadEnv({ path: custom })
    expect(source.get("KEY")).toBe("from-file")
    expect(source.get("DIR_ONLY")).toBeUndefined()
  })

  it("applies the override/system precedence matrix", () => {
    writeFileSync(resolve(TMP, ".env"), "SHARED=from-file\n", "utf-8")
    process.env.SHARED = "from-process"
    process.env.PROC_ONLY = "from-process"
    try {
      // Default is dotenv-style: process.env wins, files fill the gaps.
      expect(loadEnv({ path: TMP }).get("SHARED")).toBe("from-process")
      // override flips it: files win, process.env is invisible ...
      expect(loadEnv({ path: TMP, override: true }).get("SHARED")).toBe("from-file")
      expect(loadEnv({ path: TMP, override: true }).get("PROC_ONLY")).toBeUndefined()
      // ... unless system re-admits process.env as a fallback.
      expect(loadEnv({ path: TMP, override: true, system: true }).get("PROC_ONLY")).toBe(
        "from-process",
      )
    } finally {
      delete process.env.SHARED
      delete process.env.PROC_ONLY
    }
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

  it("calls process.loadEnvFile once per existing file, lowest priority first", () => {
    const base = resolve(TMP, ".env")
    const dev = resolve(TMP, ".env.development")
    const local = resolve(TMP, ".env.local")
    writeFileSync(base, "KEY=base\n", "utf-8")
    writeFileSync(dev, "KEY=dev\n", "utf-8")
    writeFileSync(local, "KEY=local\n", "utf-8")
    withNodeEnv("development", () => {
      withNativeLoader(() => {}, (mock) => {
        const source = loadEnv({ path: TMP, native: true })
        // loadEnvFile takes a single path and never overrides, so reverse
        // order keeps .env.local winning, exactly like the built-in parser.
        expect(mock.mock.calls).toEqual([[local], [dev], [base]])
        // Native mode returns a live process.env source.
        process.env.__CTROENV_NATIVE_TEST__ = "live"
        try {
          expect(source.get("__CTROENV_NATIVE_TEST__")).toBe("live")
        } finally {
          delete process.env.__CTROENV_NATIVE_TEST__
        }
      })
    })
  })

  it("skips process.loadEnvFile when no files exist", () => {
    withNativeLoader(() => {}, (mock) => {
      const source = loadEnv({ path: TMP, native: true })
      expect(mock).not.toHaveBeenCalled()
      expect(source.get("MISSING_KEY")).toBeUndefined()
    })
  })

  it("warns and falls back to the built-in parser when native loading fails", () => {
    writeFileSync(resolve(TMP, ".env"), "KEY=from-file\n", "utf-8")
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    try {
      withNativeLoader(
        () => {
          throw new Error("boom")
        },
        (mock) => {
          const source = loadEnv({ path: TMP, native: true })
          expect(mock).toHaveBeenCalledTimes(1)
          expect(source.get("KEY")).toBe("from-file")
        },
      )
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("loadEnvFile"))
    } finally {
      warn.mockRestore()
    }
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
