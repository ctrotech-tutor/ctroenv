import {
  CtroEnvError,
  defineEnv as coreDefineEnv,
  detectSource,
  type SchemaDefinition,
  type Validator,
} from "@ctroenv/core"

import type { NextConfig } from "next"

declare const window: unknown

export interface NextSchemaDefinition {
  server: SchemaDefinition
  client: SchemaDefinition
}

export type InferredNextEnv<T extends NextSchemaDefinition> = {
  [K in keyof T["server"]]: T["server"][K] extends Validator<infer V> ? V : never
} & {
  [K in keyof T["client"]]: T["client"][K] extends Validator<infer V> ? V : never
}

export function defineEnv<T extends NextSchemaDefinition>(schema: T): InferredNextEnv<T> {
  const isServer = typeof window === "undefined"
  const source = detectSource()

  let serverResult: Record<string, unknown>
  let clientResult: Record<string, unknown>

  const serverKeys = Object.keys(schema.server)

  if (isServer) {
    serverResult = coreDefineEnv(schema.server, { source })
    clientResult = coreDefineEnv(schema.client, { source })
  } else {
    serverResult = {}
    clientResult = coreDefineEnv(schema.client, { source })
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

  function getMeta():
    | {
        get(k: string): string | undefined
        has(k: string): boolean
        keys(): string[]
        toJSON(): Record<string, string | undefined>
      }
    | undefined {
    const srvMeta = (server as Record<string, unknown> & { meta?: unknown }).meta
    if (srvMeta && typeof (srvMeta as { get: unknown }).get === "function")
      return srvMeta as ReturnType<typeof getMeta>
    const cliMeta = (client as Record<string, unknown> & { meta?: unknown }).meta
    if (cliMeta && typeof (cliMeta as { get: unknown }).get === "function")
      return cliMeta as ReturnType<typeof getMeta>
    return undefined
  }

  const meta = getMeta()

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
