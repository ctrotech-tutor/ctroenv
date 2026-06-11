import { ValidationError } from "../errors"
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
        new ValidationError({
          key,
          message: `Missing required environment variable: ${prefixedKey}`,
          code: "missing_required",
          suggestion: validator.metadata.description
            ? `${validator.metadata.description}`
            : undefined,
        }),
      )
      continue
    }

    const context = { key, path: [key] }
    const result = validator.parse(raw, context)

    if (result.success) {
      value[key] = result.value
    } else {
      errors.push(
        ...result.errors.map((e) => {
          return new ValidationError({
            key,
            message: e.message,
            code: e.code,
            value: e.value ?? raw,
            suggestion: e.suggestion,
          })
        }),
      )
    }
  }

  return { value, errors }
}
