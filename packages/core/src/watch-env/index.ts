import type { DefineEnvOptions } from "../define-env/index"
import { createMaskedEnv } from "../define-env/mask"
import { detectSource, type EnvSource, objectSource } from "../define-env/source"
import { walkSchema } from "../define-env/validate"
import { CtroEnvError } from "../errors/ctroenv-error"
import type { ValidationError } from "../errors/validation-error"
import type { EnvResult, SchemaDefinition } from "../types"

export interface WatchEnvOptions extends DefineEnvOptions {
  pollInterval?: number
  onChange?: (key: string, oldValue: unknown, newValue: unknown) => void
  onError?: (errors: readonly ValidationError[]) => void
}

export type WatchEnvResult<T extends SchemaDefinition> = EnvResult<T> & {
  readonly unwatch: () => void
}

const MASKED_DEFAULT = "********"

export function watchEnv<T extends SchemaDefinition>(
  schema: T,
  opts?: WatchEnvOptions,
): WatchEnvResult<T> {
  const source: EnvSource = opts?.source
    ? isRecordSource(opts.source)
      ? objectSource(opts.source)
      : opts.source
    : detectSource()

  const prefix = opts?.prefix
  const pollInterval = opts?.pollInterval ?? 500

  const initial = walkSchema(schema, source, prefix)
  if (initial.errors.length > 0) {
    throw new CtroEnvError(initial.errors)
  }

  const values: Record<string, unknown> = { ...initial.value }

  const secretKeys = new Set(
    Object.entries(schema)
      .filter(([, v]) => v.metadata.isSecret)
      .map(([k]) => k),
  )

  const lastRaw = new Map<string, string | undefined>()
  for (const key of Object.keys(schema)) {
    const prefixedKey = prefix ? `${prefix}${key}` : key
    lastRaw.set(key, source.get(prefixedKey))
  }

  let intervalId: ReturnType<typeof setInterval> | undefined

  function unwatch(): void {
    if (intervalId !== undefined) {
      clearInterval(intervalId)
      intervalId = undefined
    }
  }

  function poll(): void {
    let changed = false
    const newRaw = new Map<string, string | undefined>()

    for (const key of Object.keys(schema)) {
      const prefixedKey = prefix ? `${prefix}${key}` : key
      const raw = source.get(prefixedKey)
      newRaw.set(key, raw)
      if (raw !== lastRaw.get(key)) {
        changed = true
      }
    }

    if (!changed) return

    const result = walkSchema(schema, source, prefix)

    if (result.errors.length > 0) {
      opts?.onError?.(result.errors)
      return
    }

    for (const key of Object.keys(result.value)) {
      const oldVal = values[key]
      const newVal = result.value[key]
      values[key] = newVal
      if (oldVal !== newVal) {
        opts?.onChange?.(key, oldVal, newVal)
      }
    }

    for (const [key, raw] of newRaw) {
      lastRaw.set(key, raw)
    }
  }

  intervalId = setInterval(poll, pollInterval)

  const extraMethods: Record<string, () => void> = { unwatch }

  return createMaskedEnv(
    values,
    secretKeys,
    MASKED_DEFAULT,
    opts?.maskWith,
    extraMethods,
  ) as unknown as WatchEnvResult<T>
}

function isRecordSource(
  source: EnvSource | Record<string, string | undefined>,
): source is Record<string, string | undefined> {
  return !("get" in source)
}
