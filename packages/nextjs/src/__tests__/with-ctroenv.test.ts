import { string } from "@ctroenv/core"
import { beforeEach, describe, expect, it } from "vitest"
import { withCtroEnv } from "../index"

describe("withCtroEnv", () => {
  const schema = {
    server: {
      DATABASE_URL: string().url(),
    },
    client: {},
  }

  beforeEach(() => {
    delete process.env.DATABASE_URL
  })

  it("wraps nextConfig without changing it", () => {
    const nextConfig = { reactStrictMode: true }
    const result = withCtroEnv(schema, nextConfig)
    expect(result.reactStrictMode).toBe(true)
    expect(result.webpack).toBeDefined()
  })

  it("preserves existing webpack config", () => {
    const webpackSpy = () => "original-config"
    const result = withCtroEnv(schema, { webpack: webpackSpy })
    expect(result.webpack).toBeDefined()
  })

  it("handles empty nextConfig", () => {
    const result = withCtroEnv(schema)
    expect(result.webpack).toBeDefined()
  })
})
