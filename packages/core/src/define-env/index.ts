import { CtroEnvError } from "../errors/ctroenv-error"
import type { SchemaDefinition } from "../types"
import { detectSource, type EnvSource, objectSource } from "./source"
import { walkSchema } from "./validate"

export interface DefineEnvOptions {
  source?: EnvSource | Record<string, string | undefined>
  prefix?: string
}

export function defineEnv<T extends SchemaDefinition>(
  schema: T,
  opts?: DefineEnvOptions,
): {
  readonly [K in keyof T]: T[K] extends import("../types").Validator<infer V> ? V : never
} {
  const source: EnvSource = opts?.source
    ? isRecordSource(opts.source)
      ? objectSource(opts.source)
      : opts.source
    : detectSource()

  const { value, errors } = walkSchema(schema, source, opts?.prefix)

  if (errors.length > 0) {
    throw new CtroEnvError(errors)
  }

  return deepFreeze(value) as {
    readonly [K in keyof T]: T[K] extends import("../types").Validator<infer V> ? V : never
  }
}

function isRecordSource(
  source: EnvSource | Record<string, string | undefined>,
): source is Record<string, string | undefined> {
  return !("get" in source)
}

function deepFreeze<T extends Record<string, unknown>>(obj: T): Readonly<T> {
  for (const value of Object.values(obj)) {
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
      deepFreeze(value as Record<string, unknown>)
    }
  }
  return Object.freeze(obj)
}
