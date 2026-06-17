import { CtroEnvError } from "../errors/ctroenv-error"
import type { EnvMeta, EnvResult, SchemaDefinition } from "../types"
import { detectSource, type EnvSource, objectSource } from "./source"
import { walkSchema } from "./validate"

export interface DefineEnvOptions {
  source?: EnvSource | Record<string, string | undefined>
  prefix?: string
}

const MASKED = "********"

export function defineEnv<T extends SchemaDefinition>(
  schema: T,
  opts?: DefineEnvOptions,
): EnvResult<T> {
  const source: EnvSource = opts?.source
    ? isRecordSource(opts.source)
      ? objectSource(opts.source)
      : opts.source
    : detectSource()

  const { value, errors } = walkSchema(schema, source, opts?.prefix)

  if (errors.length > 0) {
    throw new CtroEnvError(errors)
  }

  const secretKeys = new Set(
    Object.entries(schema)
      .filter(([, v]) => v.metadata.isSecret)
      .map(([k]) => k),
  )

  return createMaskedEnv(value, secretKeys) as unknown as EnvResult<T>
}

function createMeta(values: Record<string, unknown>): EnvMeta {
  const meta: EnvMeta = {
    get(key: string): unknown {
      return values[key]
    },
    has(key: string): boolean {
      return key in values
    },
    keys(): string[] {
      return Object.keys(values)
    },
    toJSON(): Record<string, string | undefined> {
      const result: Record<string, string | undefined> = {}
      for (const [k, v] of Object.entries(values)) {
        result[k] = v !== undefined ? String(v) : undefined
      }
      return result
    },
  }
  return meta
}

function createMaskedEnv(
  values: Record<string, unknown>,
  secretKeys: Set<string>,
): Record<string, unknown> & { meta: EnvMeta } {
  const meta = createMeta(values)

  const proxy = new Proxy(values, {
    get(_target, key, _receiver) {
      if (key === "meta") return meta
      if (typeof key === "string" && secretKeys.has(key)) return MASKED
      return Reflect.get(values, key)
    },
    has(_target, key) {
      if (key === "meta") return true
      return Reflect.has(values, key)
    },
    ownKeys(_target) {
      return [...Reflect.ownKeys(values), "meta"]
    },
    getOwnPropertyDescriptor(_target, key) {
      if (key === "meta") {
        return {
          configurable: true,
          enumerable: false,
          writable: false,
          value: meta,
        }
      }
      return Reflect.getOwnPropertyDescriptor(values, key)
    },
    set() {
      throw new TypeError("Cannot assign to read-only property")
    },
    deleteProperty() {
      throw new TypeError("Cannot delete property of frozen object")
    },
  })

  return proxy as Record<string, unknown> & { meta: EnvMeta }
}

function isRecordSource(
  source: EnvSource | Record<string, string | undefined>,
): source is Record<string, string | undefined> {
  return !("get" in source)
}
