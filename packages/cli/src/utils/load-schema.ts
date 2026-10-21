import { pathToFileURL } from "node:url"
import type { SchemaDefinition, Validator } from "@ctroenv/core"
import { createJiti } from "jiti"
import { cliLogger } from "./logger"

let _jiti: ReturnType<typeof createJiti> | null = null

function getJiti(): ReturnType<typeof createJiti> {
  if (!_jiti) {
    _jiti = createJiti(import.meta.url, { interopDefault: true })
  }
  return _jiti
}

function extractSchema(mod: Record<string, unknown>): SchemaDefinition {
  return (mod.schema ?? mod.env ?? mod.default) as SchemaDefinition
}

function isNextSchema(
  schema: unknown,
): schema is { server: SchemaDefinition; client: SchemaDefinition } {
  if (typeof schema !== "object" || schema === null) return false
  const s = schema as Record<string, unknown>
  if (!("server" in s) || !("client" in s)) return false
  const server = s.server
  const client = s.client
  if (typeof server !== "object" || server === null) return false
  if (typeof client !== "object" || client === null) return false
  if (typeof (server as Validator<unknown>).parse === "function") return false
  if (typeof (client as Validator<unknown>).parse === "function") return false
  return true
}

function flattenSchema(raw: SchemaDefinition): SchemaDefinition {
  if (isNextSchema(raw)) {
    return { ...raw.server, ...raw.client }
  }
  return raw
}

function assertValidSchema(raw: unknown, path: string): SchemaDefinition {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(
      `Could not load schema from ${path}: expected an object of validators (\`export const schema = { ... }\`), ` +
        `received ${Array.isArray(raw) ? "an array" : String(raw === null ? "null" : typeof raw)}.`,
    )
  }
  const looksNext = "server" in raw && "client" in raw
  for (const [key, validator] of Object.entries(raw)) {
    const v = validator as Partial<Validator<unknown>> | null
    if (
      typeof v !== "object" ||
      v === null ||
      typeof v.parse !== "function" ||
      !("metadata" in v)
    ) {
      const hint =
        looksNext && (key === "server" || key === "client")
          ? `If this is a Next.js schema, both "server" and "client" must be objects of validators.`
          : `If this file exports a validated environment (a defineEnv() result), export the schema object instead.`
      throw new Error(
        `Could not load schema from ${path}: entry "${key}" is not a validator. ${hint}`,
      )
    }
  }
  return raw as SchemaDefinition
}

function processModule(mod: Record<string, unknown>, path: string): SchemaDefinition {
  return assertValidSchema(flattenSchema(extractSchema(mod)), path)
}

export async function loadSchema(
  path: string,
  opts?: { reload?: boolean },
): Promise<SchemaDefinition> {
  if (opts?.reload) {
    // Fresh module instance via a cache-busted URL. jiti cannot reload
    // (its module registry survives new instances), so reload is native-only;
    // callers must fall back to the previous schema when this throws.
    // `?v=` (not the HMR-style `?t=`, which Vite strips for cache identity)
    // busts both Node's and Vitest's module caches.
    const url = `${pathToFileURL(path).href}?v=${Date.now()}`
    const mod = await import(url)
    return processModule(mod as Record<string, unknown>, path)
  }
  let mod: unknown
  try {
    mod = await import(pathToFileURL(path).href)
  } catch (nativeErr) {
    cliLogger.debug("Native import failed, trying jiti:", nativeErr)
    try {
      mod = getJiti()(path)
    } catch {
      throw new Error(
        `Could not load schema from ${path}. Ensure the file exports a schema using \`export const schema = { ... }\``,
      )
    }
  }
  return processModule(mod as Record<string, unknown>, path)
}
