import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { EnvSource } from "@ctroenv/core"

export type { EnvSource }

export interface LoadEnvOptions {
  path?: string
  encoding?: BufferEncoding
  override?: boolean
  system?: boolean
  native?: boolean
}

export function nodeSource(): EnvSource {
  return {
    get(key: string): string | undefined {
      return process.env[key]
    },
  }
}

export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  content = content.replace(/\r\n/g, "\n").replace(/^\uFEFF/, "")
  const lines = content.split("\n")
  let continuation = ""

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] as string
    let line = raw.trim()

    if (continuation) {
      const trimmed = line.endsWith("\\") ? line.slice(0, -1).trimEnd() : line
      continuation += `\n${trimmed}`
      if (!line.endsWith("\\")) {
        const eq = continuation.indexOf("=")
        const key = continuation
          .slice(0, eq)
          .trim()
          .replace(/^export\s+/, "")
        let value = continuation.slice(eq + 1)
        value = parseEnvValue(value)
        result[key] = interpolate(value, result)
        continuation = ""
      }
      continue
    }

    if (!line || line.startsWith("#")) continue

    if (line.startsWith("export ")) {
      line = line.slice(7).trimStart()
    }

    const eq = line.indexOf("=")
    if (eq === -1) continue

    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()

    if (value.endsWith("\\") && !isQuoted(value)) {
      continuation = `${key}=${value.slice(0, -1).trimEnd()}`
      continue
    }

    value = parseEnvValue(value)
    result[key] = interpolate(value, result)
  }

  return result
}

function isQuoted(value: string): boolean {
  return (
    (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
  )
}

function stripQuotes(value: string): string {
  return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\n/g, "\n")
}

function parseEnvValue(value: string): string {
  value = value.trim()

  if (isQuoted(value)) {
    return stripQuotes(value)
  }

  const hashIndex = value.indexOf("#")
  if (hashIndex !== -1) {
    const before = value.slice(0, hashIndex).trimEnd()
    const after = value.slice(hashIndex + 1)
    if (after.trim() !== "") {
      if (isQuoted(before)) {
        return stripQuotes(before)
      }
      value = before
    }
  }

  return value
}

function interpolate(value: string, env: Record<string, string>): string {
  const SENTINEL = "\x00"
  return value
    .replace(/\$\$/g, SENTINEL)
    .replace(/\$\{(\w+)\}|\$(\w+)/g, (match, brace, simple) => {
      const name = brace ?? simple ?? ""
      if (name in env) return env[name] as string
      if (process.env[name] !== undefined) return process.env[name] as string
      return match
    })
    .split(SENTINEL)
    .join("$")
}

const ENV_FILES = [".env", `.env.${process.env.NODE_ENV ?? "development"}`, ".env.local"]

function resolveFiles(root: string): string[] {
  return ENV_FILES.map((f) => join(root, f))
}

export function loadEnv(opts?: LoadEnvOptions): EnvSource {
  const root = opts?.path ?? process.cwd()
  const encoding = opts?.encoding ?? "utf-8"
  const env: Record<string, string> = {}

  if (opts?.native && typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(root)
      return nodeSource()
    } catch {
      // Fall through to custom parsing
    }
  }

  for (const filePath of resolveFiles(root)) {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, encoding)
      const parsed = parseEnvFile(content)
      Object.assign(env, parsed)
    }
  }

  return {
    get(key: string): string | undefined {
      if (!opts?.override && process.env[key] !== undefined) {
        return process.env[key]
      }
      if (key in env) return env[key]
      if (opts?.system) return process.env[key]
      return undefined
    },
  }
}
