import type { ParseResult, Validator, ValidatorMetadata } from "../types"

export function createValidator<T>(
  parseFn: (input: unknown, context: { key: string; path: readonly string[] }) => ParseResult<T>,
  metadata: Partial<ValidatorMetadata>,
): Validator<T> {
  const base: Validator<T> = {
    _type: null as unknown as T,
    parse(input, context) {
      return parseFn(input, context)
    },
    metadata: {
      optional: false,
      hasDefault: false,
      isSecret: false,
      typeLabel: "unknown",
      ...metadata,
    },
  }
  return base
}
