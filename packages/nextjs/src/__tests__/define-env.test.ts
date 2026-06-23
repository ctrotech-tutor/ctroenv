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
    expect(env.NEXT_PUBLIC_API_URL).toBe("https://api.example.com")
  })

  it("masks secret values on server", () => {
    const env = defineEnv(schema)
    expect(env.JWT_SECRET).toBe("********")
  })

  it("exposes raw secret values via env.meta.get()", () => {
    const env = defineEnv(schema)
    expect(env.meta.get("JWT_SECRET")).toBe("super-secret")
  })

  it("env.meta.has() works correctly", () => {
    const env = defineEnv(schema)
    expect(env.meta.has("DATABASE_URL")).toBe(true)
    expect(env.meta.has("NONEXISTENT")).toBe(false)
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

  it("JSON.stringify does not leak secret values", () => {
    const env = defineEnv(schema)
    const serialized = JSON.stringify(env)
    expect(serialized).not.toContain("super-secret")
    expect(serialized).toContain("********")
    expect(serialized).toContain("postgres://localhost:5432/db")
  })

  it("meta is non-enumerable and not visible in Object.keys", () => {
    const env = defineEnv(schema)
    expect(Object.keys(env)).not.toContain("meta")
    expect(env.meta).toBeDefined()
  })

  it("has trap returns true for meta key", () => {
    const env = defineEnv(schema)
    expect("meta" in env).toBe(true)
  })

  it("has trap returns true for known server key", () => {
    const env = defineEnv(schema)
    expect("DATABASE_URL" in env).toBe(true)
  })

  it("has trap returns true for known client key", () => {
    const env = defineEnv(schema)
    expect("NEXT_PUBLIC_API_URL" in env).toBe(true)
  })

  it("has trap returns false for unknown key", () => {
    const env = defineEnv(schema)
    expect("NONEXISTENT" in env).toBe(false)
  })

  it("ownKeys includes meta", () => {
    const env = defineEnv(schema)
    expect(Reflect.ownKeys(env)).toContain("meta")
  })

  it("getOwnPropertyDescriptor for meta is non-enumerable", () => {
    const env = defineEnv(schema)
    const desc = Object.getOwnPropertyDescriptor(env, "meta")
    expect(desc).toBeDefined()
    expect(desc?.enumerable).toBe(false)
  })

  it("getOwnPropertyDescriptor for known server key is enumerable", () => {
    const env = defineEnv(schema)
    const desc = Object.getOwnPropertyDescriptor(env, "DATABASE_URL")
    expect(desc).toBeDefined()
    expect(desc?.enumerable).toBe(true)
  })

  it("getOwnPropertyDescriptor for unknown key returns undefined", () => {
    const env = defineEnv(schema)
    const desc = Object.getOwnPropertyDescriptor(env, "NONEXISTENT")
    expect(desc).toBeUndefined()
  })

  it("returns undefined for missing key access", () => {
    const env = defineEnv(schema)
    expect((env as Record<string, unknown>).NONEXISTENT).toBeUndefined()
  })
})
