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

export async function loadSchema(path: string): Promise<SchemaDefinition> {
  try {
    const mod = await import(path)
    return flattenSchema(extractSchema(mod as Record<string, unknown>))
  } catch (nativeErr) {
    cliLogger.debug("Native import failed, trying jiti:", nativeErr)
    try {
      const mod = getJiti()(path)
      return flattenSchema(extractSchema(mod as Record<string, unknown>))
    } catch {
      throw new Error(
        `Could not load schema from ${path}. Ensure the file exports a schema using \`export const schema = { ... }\``,
      )
    }
  }
}
