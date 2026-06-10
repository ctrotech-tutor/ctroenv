import type { Plugin } from "vite"

export const version = "0.0.0"

export function viteSource() {
  return {
    get(key: string): string | undefined {
      const env = getImportMetaEnv()
      if (env) {
        return env[key]
      }
      if (typeof process !== "undefined" && process.env) {
        return process.env[key]
      }
      return undefined
    },
  }
}

function getImportMetaEnv(): Record<string, string> | null {
  try {
    // @ts-expect-error — import.meta.env is a Vite runtime feature
    if (typeof import.meta !== "undefined" && import.meta.env) {
      // @ts-expect-error
      return import.meta.env
    }
  } catch {
    // Not in a Vite environment
  }
  return null
}

export function ctroenvPlugin(): Plugin {
  return {
    name: "ctroenv",
    buildStart() {
      // Build-time validation — implemented in Phase 3
    },
  }
}
