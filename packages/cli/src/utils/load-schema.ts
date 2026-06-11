import type { SchemaDefinition } from "@ctroenv/core"
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

export async function loadSchema(path: string): Promise<SchemaDefinition> {
  try {
    const mod = await import(path)
    return extractSchema(mod as Record<string, unknown>)
  } catch (nativeErr) {
    cliLogger.debug("Native import failed, trying jiti:", nativeErr)
    try {
      const mod = getJiti()(path)
      return extractSchema(mod as Record<string, unknown>)
    } catch {
      throw new Error(
        `Could not load schema from ${path}. Ensure the file exports a schema using \`export const schema = { ... }\``,
      )
    }
  }
}
