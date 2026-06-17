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

export function detectSource(): EnvSource {
  const fromProcess = tryProcessEnv()
  const fromImportMeta = tryImportMetaEnv()

  if (fromProcess && fromImportMeta) {
    return {
      get(key: string) {
        const fromMeta = fromImportMeta.get(key)
        if (fromMeta !== undefined) return fromMeta
        return fromProcess.get(key)
      },
    }
  }

  if (fromImportMeta) return fromImportMeta
  if (fromProcess) return fromProcess

  throw new Error("No environment source detected. Pass `source` explicitly to `defineEnv()`.")
}
