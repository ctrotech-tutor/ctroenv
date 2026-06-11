import { ValidationError } from "../errors"
import type { Validator } from "../types"
import type { ParseContext } from "../types/validator"
import { parseOk, singleError } from "../types/validator"
import { applyChain, type ChainableMethods } from "./chain"
import { createValidator } from "./factory"

export interface PickValidator<T extends readonly string[]>
  extends Validator<T[number]>,
    ChainableMethods<T[number]> {}

export function pick<T extends readonly string[]>(values: T): PickValidator<T> {
  const validSet = new Set(values)

  function suggest(input: string): string | undefined {
    const lower = input.toLowerCase()
    for (const v of values) {
      if (v.toLowerCase() === lower) return v
    }
    for (const v of values) {
      if (v.toLowerCase().startsWith(lower) || lower.startsWith(v.toLowerCase())) return v
    }
    return undefined
  }

  const base = applyChain(
    createValidator<T[number]>(
      (input: unknown, context: ParseContext) => {
        if (typeof input !== "string") {
          return singleError(
            new ValidationError({
              key: context.key,
              message: `Expected a string, received ${typeof input}`,
              code: "type_mismatch",
              value: input,
            }),
          )
        }

        if (validSet.has(input as T[number])) {
          return parseOk(input as T[number])
        }

        const suggestion = suggest(input)
        const expected = values.map((v) => `'${v}'`).join(", ")

        return singleError(
          new ValidationError({
            key: context.key,
            message: `Expected one of ${expected}, received "${input}"`,
            code: "invalid_value",
            value: input,
            suggestion: suggestion ? `Did you mean '${suggestion}'?` : undefined,
          }),
        )
      },
      { typeLabel: values.join("|") },
    ),
  ) as PickValidator<T>

  return base
}
