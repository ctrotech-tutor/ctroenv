import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { EnvSource } from "@ctroenv/core"

export type { EnvSource }

export interface LoadEnvOptions {
  path?: string
  encoding?: BufferEncoding
  override?: boolean
  system?: boolean
}

export function nodeSource(): EnvSource {
  return {
    get(key: string): string | undefined {
      return process.env[key]
    },
  }
}

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const raw of content.split("\n")) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    result[key] = value
  }
  return result
}

const ENV_FILES = [".env", `.env.${process.env.NODE_ENV ?? "development"}`, ".env.local"]

function resolveFiles(root: string): string[] {
  return ENV_FILES.map((f) => join(root, f))
}

export function loadEnv(opts?: LoadEnvOptions): EnvSource {
  const root = opts?.path ?? process.cwd()
  const encoding = opts?.encoding ?? "utf-8"
  const env: Record<string, string> = {}

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
