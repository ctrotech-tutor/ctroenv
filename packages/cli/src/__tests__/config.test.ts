import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { resolveConfig } from "../utils/config"

const FIXTURES = resolve(__dirname, "fixtures")

describe("resolveConfig", () => {
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
})
