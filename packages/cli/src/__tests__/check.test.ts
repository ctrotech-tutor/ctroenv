import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { number, string } from "@ctroenv/core"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { checkCommand } from "../commands/check"
import { ExitCode } from "../exit-codes"

const TMP = resolve(__dirname, ".tmp-check-test")

describe("check command", () => {
  const schema = {
    DATABASE_URL: string().url(),
    PORT: number().port().default(3000),
    NODE_ENV: string(),
  }

  beforeEach(() => {
    rmSync(TMP, { recursive: true, force: true })
    mkdirSync(TMP, { recursive: true })
  })

  afterEach(() => {
    rmSync(TMP, { recursive: true, force: true })
  })

  it("reports clean when all keys match", async () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(
      envPath,
      ["DATABASE_URL=postgres://localhost/db", "PORT=4000", "NODE_ENV=prod"].join("\n"),
      "utf-8",
    )

    const code = await checkCommand({
      schema,
      source: envPath,
      json: "text",
    })
    expect(code).toBe(ExitCode.Success)
  })

  it("reports missing keys", async () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(envPath, "DATABASE_URL=postgres://localhost/db\n", "utf-8")

    const code = await checkCommand({
      schema,
      source: envPath,
      json: "text",
    })
    expect(code).toBe(ExitCode.ValidationError)
  })

  it("reports unused keys", async () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(
      envPath,
      ["DATABASE_URL=postgres://localhost/db", "PORT=4000", "NODE_ENV=prod", "UNUSED_KEY=val"].join(
        "\n",
      ),
      "utf-8",
    )

    const code = await checkCommand({
      schema,
      source: envPath,
      json: "text",
    })
    expect(code).toBe(ExitCode.ValidationError)
  })

  it("outputs JSON when --json flag", async () => {
    const envPath = resolve(TMP, ".env")
    writeFileSync(envPath, "DATABASE_URL=postgres://localhost/db\n", "utf-8")

    const logs: string[] = []
    const spy = vi.spyOn(console, "log").mockImplementation((...args) => logs.push(args.join(" ")))

    const code = await checkCommand({
      schema,
      source: envPath,
      json: "json",
    })

    spy.mockRestore()

    expect(code).toBe(ExitCode.ValidationError)
    expect(logs.length).toBe(1)
    const parsed = JSON.parse(logs[0])
    expect(parsed.clean).toBe(false)
    expect(parsed.missing).toContain("PORT")
    expect(parsed.missing).toContain("NODE_ENV")
  })
})
