import { beforeEach, describe, expect, it } from "vitest"
import { CtroEnvError, string } from "../../../core/src"
import { withCtroEnv } from "../index"

describe("withCtroEnv", () => {
  const validSchema = {
    server: {
      DATABASE_URL: string().url(),
    },
    client: {},
  }

  beforeEach(() => {
    delete process.env.DATABASE_URL
  })

  it("wraps nextConfig without changing it", () => {
    process.env.DATABASE_URL = "postgres://localhost/db"
    const nextConfig = { reactStrictMode: true }
    const result = withCtroEnv(validSchema, nextConfig)
    expect(result.reactStrictMode).toBe(true)
  })

  it("does not inject webpack config when none exists", () => {
    process.env.DATABASE_URL = "postgres://localhost/db"
    const result = withCtroEnv(validSchema)
    expect(result.webpack).toBeUndefined()
  })

  it("preserves existing webpack config", () => {
    process.env.DATABASE_URL = "postgres://localhost/db"
    const webpackSpy = () => "original-config"
    const result = withCtroEnv(validSchema, { webpack: webpackSpy })
    expect(result.webpack).toBeDefined()
  })

  it("validates env and throws on invalid values", () => {
    delete process.env.DATABASE_URL
    expect(() => withCtroEnv(validSchema)).toThrow(CtroEnvError)
  })

  it("passes validation with valid env", () => {
    process.env.DATABASE_URL = "postgres://localhost/db"
    expect(() => withCtroEnv(validSchema)).not.toThrow()
  })
})
