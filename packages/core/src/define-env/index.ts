import { CtroEnvError } from "../errors/ctroenv-error"
import type { EnvResult, SchemaDefinition } from "../types"
import { createMaskedEnv } from "./mask"
import { detectSource, type EnvSource, objectSource } from "./source"
import { walkSchema } from "./validate"

export interface DefineEnvOptions {
  source?: EnvSource | Record<string, string | undefined>
  prefix?: string
  maskWith?: string
}

const MASKED_DEFAULT = "********"

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

  return createMaskedEnv(
    value,
    secretKeys,
    MASKED_DEFAULT,
    opts?.maskWith,
  ) as unknown as EnvResult<T>
}

function isRecordSource(
  source: EnvSource | Record<string, string | undefined>,
): source is Record<string, string | undefined> {
  return !("get" in source)
}
