import type { ValidationError } from "../errors"
import { errMissing, errWrap } from "../errors/messages"
import type { SchemaDefinition } from "../types"
import type { EnvSource } from "./source"

export interface WalkResult {
  value: Record<string, unknown>
  errors: ValidationError[]
}

export function walkSchema(
  schema: SchemaDefinition,
  source: EnvSource,
  prefix?: string,
): WalkResult {
  const value: Record<string, unknown> = {}
  const errors: ValidationError[] = []

  for (const key of Object.keys(schema)) {
    const validator = schema[key]
    if (!validator) continue
    if (typeof validator !== "object" || validator === null || !("metadata" in validator)) {
      throw new TypeError(
        `Schema entry "${key}" is not a validator. ` +
          `Expected a Validator from string()/number()/boolean()/pick(). ` +
          `If using a Next.js schema ({ server, client }), use @ctroenv/nextjs's defineEnv() instead.`,
      )
    }
    const prefixedKey = prefix ? `${prefix}${key}` : key
    const raw = source.get(prefixedKey)

    if (raw === undefined) {
      if (validator.metadata.hasDefault) {
        value[key] = validator.metadata.defaultValue
        continue
      }
      if (validator.metadata.optional) {
        value[key] = undefined
        continue
      }
      errors.push(
        errMissing(key, {
          description: validator.metadata.description,
        }),
      )
      continue
    }

    const context = { key, path: [key] }
    const result = validator.parse(raw, context)

    if (result.success) {
      value[key] = result.value
    } else {
      const isSecret = validator.metadata.isSecret
      errors.push(
        ...result.errors.map((e) => {
          return errWrap(
            key,
            isSecret ? "********" : (e.value ?? raw),
            isSecret ? "Invalid value for secret variable" : e.message,
            e.code,
            {
              suggestion: e.suggestion,
            },
          )
        }),
      )
    }
  }

  return { value, errors }
}
