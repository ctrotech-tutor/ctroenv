import { errInvalid, errType } from "../errors"
import type { Validator } from "../types"
import type { ParseContext } from "../types/validator"
import { parseOk, singleError } from "../types/validator"
import { applyChain, type ChainableMethods } from "./chain"
import { createValidator } from "./factory"

export interface PickValidator<T extends readonly string[]>
  extends Validator<T[number]>,
    ChainableMethods<T[number]> {}

export function pick<const T extends readonly string[]>(values: T): PickValidator<T> {
  if (values.length === 0) {
    throw new TypeError("pick() requires at least one allowed value")
  }

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
            errType(context.key, typeof input, `one of ${values.join(", ")}`, {
              originalValue: input,
            }),
          )
        }

        if (validSet.has(input as T[number])) {
          return parseOk(input as T[number])
        }

        const suggestion = suggest(input)
        const expected = values.map((v) => `'${v}'`).join(", ")

        return singleError(
          errInvalid(context.key, input, `Expected one of ${expected}`, {
            suggestion: suggestion ? `Did you mean '${suggestion}'?` : undefined,
          }),
        )
      },
      { typeLabel: values.join("|") },
    ),
  ) as PickValidator<T>

  return base
}
