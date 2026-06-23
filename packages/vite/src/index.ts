import { CtroEnvError, defineEnv, formatErrors, type SchemaDefinition } from "@ctroenv/core"
import type { Plugin } from "vite"

export interface CtroEnvPluginOptions {
  schema: string | SchemaDefinition
  failOnError?: boolean
  maskWith?: string
}

export function viteSource() {
  return {
    get(key: string): string | undefined {
      try {
        const env = (import.meta as unknown as Record<string, unknown>).env as
          | Record<string, string | undefined>
          | undefined
        if (env && key in env) {
          return env[key]
        }
      } catch {
        // Not in a Vite ESM environment
      }
      if (typeof process !== "undefined" && process.env) {
        return process.env[key]
      }
      return undefined
    },
  }
}

async function loadSchemaModule(path: string): Promise<SchemaDefinition> {
  const mod = await import(/* @vite-ignore */ path)
  return (mod.schema ?? mod.env ?? mod.default) as SchemaDefinition
}

export function ctroenvPlugin(opts: CtroEnvPluginOptions): Plugin {
  return {
    name: "ctroenv",
    async buildStart() {
      try {
        const schema: SchemaDefinition =
          typeof opts.schema === "string" ? await loadSchemaModule(opts.schema) : opts.schema

        defineEnv(schema, {
          source: viteSource(),
          ...(opts.maskWith ? { maskWith: opts.maskWith } : {}),
        })

        this.warn("✓ CtroEnv: All environment variables valid")
      } catch (e) {
        const message =
          e instanceof CtroEnvError
            ? formatErrors(e.errors)
            : `Could not validate environment: ${(e as Error).message}`

        if (opts.failOnError !== false) {
          this.error(`✗ CtroEnv: ${message}`)
        } else {
          this.warn(`✗ CtroEnv: ${message}`)
        }
      }
    },
  }
}
