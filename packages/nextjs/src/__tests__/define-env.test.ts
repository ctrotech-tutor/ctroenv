import { string } from "@ctroenv/core"
import { beforeEach, describe, expect, it } from "vitest"
import { defineEnv } from "../index"

describe("defineEnv (Next.js)", () => {
  const schema = {
    server: {
      DATABASE_URL: string().url(),
      JWT_SECRET: string().secret(),
    },
    client: {
      NEXT_PUBLIC_API_URL: string().url(),
    },
  }

  beforeEach(() => {
    process.env.DATABASE_URL = "postgres://localhost:5432/db"
    process.env.JWT_SECRET = "super-secret"
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com"
  })

  it("returns validated env on server", () => {
    const env = defineEnv(schema)
    expect(env.DATABASE_URL).toBe("postgres://localhost:5432/db")
    expect(env.JWT_SECRET).toBe("super-secret")
    expect(env.NEXT_PUBLIC_API_URL).toBe("https://api.example.com")
  })

  it("allows access to client vars from any environment", () => {
    const env = defineEnv(schema)
    expect(env.NEXT_PUBLIC_API_URL).toBe("https://api.example.com")
  })

  it("throws on missing required server var", () => {
    delete process.env.DATABASE_URL
    expect(() => defineEnv(schema)).toThrow()
  })

  it("throws on missing required client var", () => {
    delete process.env.NEXT_PUBLIC_API_URL
    expect(() => defineEnv(schema)).toThrow()
  })
})
