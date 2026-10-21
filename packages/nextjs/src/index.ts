import {
  type ClientServerSchema,
  CtroEnvError,
  defineEnv as coreDefineEnv,
  detectSource,
  type EnvMeta,
  type InferredClientServerEnv,
} from "@ctroenv/core"

import type { NextConfig } from "next"

declare const window: unknown

/** @deprecated Use `ClientServerSchema` from @ctroenv/core */
export type NextSchemaDefinition = ClientServerSchema

export type InferredNextEnv<T extends NextSchemaDefinition> = InferredClientServerEnv<T>

export function defineEnv<T extends NextSchemaDefinition>(
  schema: T,
  opts?: { maskWith?: string },
): InferredNextEnv<T> {
  const isServer = typeof window === "undefined"
  const source = detectSource()

  let serverResult: Record<string, unknown>
  let clientResult: Record<string, unknown>

  const serverKeys = Object.keys(schema.server)

  if (isServer) {
    serverResult = coreDefineEnv(schema.server, {
      source,
      ...(opts?.maskWith !== undefined ? { maskWith: opts.maskWith } : {}),
    })
    clientResult = coreDefineEnv(schema.client, {
      source,
      ...(opts?.maskWith !== undefined ? { maskWith: opts.maskWith } : {}),
    })
  } else {
    serverResult = {}
    clientResult = coreDefineEnv(schema.client, {
      source,
      ...(opts?.maskWith !== undefined ? { maskWith: opts.maskWith } : {}),
    })
  }

  return createEnvProxy<T>(serverKeys, serverResult, clientResult, isServer)
}

function createEnvProxy<T extends NextSchemaDefinition>(
  serverKeys: string[],
  server: Record<string, unknown>,
  client: Record<string, unknown>,
  isServer: boolean,
): InferredNextEnv<T> {
  const serverKeySet = new Set(serverKeys)
  const combined = { ...server, ...client }

  function extractMeta(result: Record<string, unknown>): EnvMeta | undefined {
    const candidate = (result as { meta?: unknown }).meta
    if (candidate && typeof (candidate as EnvMeta).get === "function") {
      return candidate as EnvMeta
    }
    return undefined
  }

  function combineMeta(
    serverMeta: EnvMeta | undefined,
    clientMeta: EnvMeta | undefined,
  ): EnvMeta | undefined {
    if (!serverMeta) return clientMeta
    if (!clientMeta) return serverMeta
    // Server wins on collision, matching property reads (serverKeySet is
    // checked first). Masking is preserved: both toJSON()s mask secrets.
    return {
      get: (key) => serverMeta.get(key) ?? clientMeta.get(key),
      has: (key) => serverMeta.has(key) || clientMeta.has(key),
      keys: () => [
        ...serverMeta.keys(),
        ...clientMeta.keys().filter((key) => !serverMeta.has(key)),
      ],
      toJSON: () => {
        // Server keys first, matching keys() order; server wins collisions.
        const out = serverMeta.toJSON()
        for (const [key, value] of Object.entries(clientMeta.toJSON())) {
          if (!(key in out)) out[key] = value
        }
        return out
      },
    }
  }

  // On the client, `server` is a bare {} with no meta, so this naturally
  // resolves to the client-only meta — server values stay unreachable.
  const meta = combineMeta(extractMeta(server), extractMeta(client))
  if (meta) Object.freeze(meta)

  return new Proxy({} as InferredNextEnv<T>, {
    get(_, key: string) {
      if (key === "meta" && meta) return meta
      if (serverKeySet.has(key)) {
        if (!isServer) {
          throw new Error(
            `Server-only environment variable "${key}" is not accessible on the client. ` +
              "Prefix it with NEXT_PUBLIC_ to expose it to the client bundle.",
          )
        }
        return server[key as keyof typeof server]
      }
      if (key in client) {
        return client[key as keyof typeof client]
      }
      return undefined
    },
    has(_, key: string) {
      if (key === "meta" && meta) return true
      return key in combined
    },
    ownKeys() {
      const keys = Reflect.ownKeys(combined)
      if (meta) return [...keys, "meta"]
      return keys
    },
    getOwnPropertyDescriptor(_, key: string) {
      if (key === "meta" && meta) {
        return { configurable: true, enumerable: false, writable: false, value: meta }
      }
      if (key in combined) {
        return { configurable: true, enumerable: true }
      }
      return undefined
    },
  }) as InferredNextEnv<T>
}

export function withCtroEnv<T extends NextSchemaDefinition>(
  schemaConfig: T,
  nextConfig: NextConfig = {},
): NextConfig {
  try {
    defineEnv(schemaConfig)
    console.log("✓ CtroEnv: All environment variables valid")
  } catch (e) {
    if (e instanceof CtroEnvError) {
      console.error(e.errors.map((err) => `  ✗ ${err.key}: ${err.message}`).join("\n"))
    }
    console.error("✗ CtroEnv: Environment validation failed")
    throw e
  }

  if (typeof nextConfig.webpack === "function") {
    return {
      ...nextConfig,
      webpack(config, options) {
        return nextConfig.webpack?.(config, options)
      },
    }
  }
  return nextConfig
}
