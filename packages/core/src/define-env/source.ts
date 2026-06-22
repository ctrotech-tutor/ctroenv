export interface EnvSource {
  get(key: string): string | undefined
}

export function objectSource(obj: Record<string, string | undefined>): EnvSource {
  return { get: (key) => obj[key] }
}

function tryProcessEnv(): EnvSource | undefined {
  if (typeof process !== "undefined" && process.env) {
    return { get: (key) => process.env[key] }
  }
  return undefined
}

function tryImportMetaEnv(): EnvSource | undefined {
  try {
    const meta = import.meta as unknown as Record<
      string,
      Record<string, string | undefined> | undefined
    >
    const env = meta.env
    if (env) {
      return { get: (key) => env[key] as string | undefined }
    }
  } catch {
    // Not in an ESM environment
  }
  return undefined
}

function tryDenoEnv(): EnvSource | undefined {
  const deno = (globalThis as Record<string, unknown>).Deno as
    | { env: { get: (key: string) => string | undefined } }
    | undefined
  if (deno?.env?.get) return { get: (k) => deno.env.get(k) }
  return undefined
}

function tryBunEnv(): EnvSource | undefined {
  const bun = (globalThis as Record<string, unknown>).Bun as
    | { env: Record<string, string | undefined> }
    | undefined
  if (bun?.env) return { get: (k) => bun.env[k] }
  return undefined
}

export function detectSource(): EnvSource {
  const fromProcess = tryProcessEnv()
  const fromImportMeta = tryImportMetaEnv()
  const fromDeno = tryDenoEnv()
  const fromBun = tryBunEnv()

  const sources = [fromImportMeta, fromDeno, fromBun, fromProcess].filter(
    (s): s is EnvSource => s !== undefined,
  )

  if (sources.length === 0) {
    throw new Error("No environment source detected. Pass `source` explicitly to `defineEnv()`.")
  }

  if (sources.length === 1) return sources[0] as EnvSource

  return {
    get(key: string) {
      for (const source of sources) {
        const value = source.get(key)
        if (value !== undefined) return value
      }
      return undefined
    },
  }
}
