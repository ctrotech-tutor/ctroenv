import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { number, pick, string } from "@ctroenv/core"
import { describe, expect, it } from "vitest"
import { validateCommand } from "../commands/validate"
import { ExitCode } from "../exit-codes"

const TMP = resolve(__dirname, ".tmp-validate-test")

describe("validate command", () => {
  const schema = {
    DATABASE_URL: string().url().describe("Database connection URL"),
    PORT: number().port().default(3000).describe("Server port"),
    NODE_ENV: pick(["development", "production", "test"] as const).default("development"),
  }

  beforeEach(() => {
    rmSync(TMP, { recursive: true, force: true })
    mkdirSync(TMP, { recursive: true })
  })

  afterEach(() => {
    rmSync(TMP, { recursive: true, force: true })
  })

  it("passes with valid env file", async () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(
      envPath,
      ["DATABASE_URL=postgres://localhost:5432/db", "PORT=4000", "NODE_ENV=production"].join("\n"),
      "utf-8",
    )

    const code = await validateCommand({
      schema,
      source: envPath,
      watch: false,
      json: "text",
    })
    expect(code).toBe(ExitCode.Success)
  })

  it("fails with invalid env file", async () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(
      envPath,
      ["DATABASE_URL=not-a-url", "PORT=abc", "NODE_ENV=invalid"].join("\n"),
      "utf-8",
    )

    const code = await validateCommand({
      schema,
      source: envPath,
      watch: false,
      json: "text",
    })
    expect(code).toBe(ExitCode.ValidationError)
  })

  it("outputs JSON with --json flag", async () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(envPath, "DATABASE_URL=not-a-url\nPORT=abc\nNODE_ENV=invalid\n", "utf-8")

    const logs: string[] = []
    const spy = vi.spyOn(console, "log").mockImplementation((...args) => logs.push(args.join(" ")))

    const code = await validateCommand({
      schema,
      source: envPath,
      watch: false,
      json: "json",
    })

    spy.mockRestore()

    expect(code).toBe(ExitCode.ValidationError)
    expect(logs.length).toBe(1)
    const parsed = JSON.parse(logs[0])
    expect(parsed.valid).toBe(false)
    expect(parsed.errors).toBeGreaterThan(0)
    expect(parsed.version).toBeDefined()
    expect(parsed.timestamp).toBeDefined()
    expect(parsed.variables).toBeDefined()
    expect(Array.isArray(parsed.variables)).toBe(true)
  })

  it("handles Next.js-style schema ({ server, client })", async () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(
      envPath,
      [
        "NEXT_PUBLIC_SANITY_PROJECT_ID=abc123",
        "NEXT_PUBLIC_SANITY_DATASET=production",
        "NEXT_PUBLIC_FORMSPREE_ID=xyz789",
      ].join("\n"),
      "utf-8",
    )

    const code = await validateCommand({
      schema: {
        NEXT_PUBLIC_SANITY_PROJECT_ID: string().describe("Sanity project ID"),
        NEXT_PUBLIC_SANITY_DATASET: string().default("production").describe("Sanity dataset name"),
        NEXT_PUBLIC_FORMSPREE_ID: string().describe("Formspree form ID"),
      },
      source: envPath,
      watch: false,
      json: "text",
    })
    expect(code).toBe(ExitCode.Success)
  })

  it("reports errors from Next.js-style schema", async () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(envPath, "NEXT_PUBLIC_SANITY_DATASET=production\n", "utf-8")

    const code = await validateCommand({
      schema: {
        DATABASE_URL: string().url().describe("Database URL"),
        NEXT_PUBLIC_SANITY_PROJECT_ID: string().describe("Sanity project ID"),
        NEXT_PUBLIC_FORMSPREE_ID: string().describe("Formspree form ID"),
      },
      source: envPath,
      watch: false,
      json: "text",
    })
    expect(code).toBe(ExitCode.ValidationError)
  })

  it("uses defaults for missing optional variables", async () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(envPath, "DATABASE_URL=postgres://localhost:5432/db\n", "utf-8")

    const code = await validateCommand({
      schema,
      source: envPath,
      watch: false,
      json: "text",
    })
    expect(code).toBe(ExitCode.Success)
  })
})
