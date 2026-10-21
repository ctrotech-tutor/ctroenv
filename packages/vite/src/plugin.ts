import { isAbsolute, resolve as resolvePath } from "node:path"
import { pathToFileURL } from "node:url"
import { CtroEnvError, defineEnv, formatErrors, type SchemaDefinition } from "@ctroenv/core"
import type { Plugin, ResolvedConfig } from "vite"

export interface CtroEnvPluginOptions {
  schema: string | SchemaDefinition
  failOnError?: boolean
  maskWith?: string
}

async function loadSchemaModule(path: string, root: string): Promise<SchemaDefinition> {
  const absolute = isAbsolute(path) ? path : resolvePath(root, path)
  const mod = await import(/* @vite-ignore */ pathToFileURL(absolute).href)
  return (mod.schema ?? mod.env ?? mod.default) as SchemaDefinition
}

interface ViteEnvResolver {
  root: string
  envDir: string | false
  mode: string
  envPrefix: string | string[]
}

interface WarnContext {
  warn(message: string): void
}

/**
 * Load `.env*` files exactly the way Vite does, so build-time validation sees
 * the same values the application will see at runtime.
 *
 * Uses Vite's own `loadEnv()` (dynamic import keeps the plugin importable even
 * when `vite` resolves oddly). Falls back to an empty map — i.e.
 * `process.env`-only validation — with a loud warning if Vite cannot be
 * loaded or the files cannot be read.
 */
async function loadViteFileEnv(
  resolver: ViteEnvResolver,
  ctx: WarnContext,
): Promise<Record<string, string>> {
  let vite: typeof import("vite")
  try {
    vite = await import("vite")
  } catch {
    ctx.warn(
      "CtroEnv: could not load the `vite` package to read `.env` files; " +
        "validating against `process.env` only. Ensure `vite` is installed.",
    )
    return {}
  }
  try {
    return vite.loadEnv(resolver.mode, resolver.envDir, resolver.envPrefix)
  } catch (e) {
    ctx.warn(
      `CtroEnv: could not load Vite env files (${(e as Error).message}); ` +
        "validating against `process.env` only.",
    )
    return {}
  }
}

function processEnvFallback(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env) {
    return process.env[key]
  }
  return undefined
}

export function ctroenvPlugin(opts: CtroEnvPluginOptions): Plugin {
  // Defaults apply when `buildStart` runs without `configResolved` (e.g. direct
  // programmatic use). Inside a real Vite run they are always overwritten below.
  const resolver: ViteEnvResolver = {
    root: process.cwd(),
    envDir: process.cwd(),
    mode: process.env.NODE_ENV ?? "development",
    envPrefix: "VITE_",
  }

  return {
    name: "ctroenv",
    configResolved(config: ResolvedConfig) {
      resolver.root = config.root
      resolver.envDir = config.envDir
      resolver.mode = config.mode
      // Vite always sets a default at runtime; the fallback guards direct use.
      resolver.envPrefix = config.envPrefix ?? "VITE_"
    },
    async buildStart() {
      try {
        const schema: SchemaDefinition =
          typeof opts.schema === "string"
            ? await loadSchemaModule(opts.schema, resolver.root)
            : opts.schema

        // Vite semantics: `.env*` files first (via Vite's own loader, which
        // already lets actual `VITE_*` process vars win over files), then the
        // full `process.env` so server-side / non-prefixed vars still validate.
        const fileEnv = await loadViteFileEnv(resolver, this)

        defineEnv(schema, {
          source: {
            get(key: string): string | undefined {
              return fileEnv[key] ?? processEnvFallback(key)
            },
          },
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
