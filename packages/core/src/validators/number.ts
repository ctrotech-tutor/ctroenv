import { ValidationError } from "../errors"
import type { Validator } from "../types"
import type { ParseContext } from "../types/validator"
import { parseOk, singleError } from "../types/validator"
import { applyChain, type ChainableMethods } from "./chain"
import { createValidator } from "./factory"

export interface NumberValidator extends Validator<number>, ChainableMethods<number> {
  int(): NumberValidator
  positive(): NumberValidator
  port(): NumberValidator
  min(value: number): NumberValidator
  max(value: number): NumberValidator
}

export function number(): NumberValidator {
  const base = applyChain(
    createValidator<number>(
      (input: unknown, context: ParseContext) => {
        let value: number
        if (typeof input === "number") {
          value = input
        } else if (typeof input === "string") {
          value = Number(input)
          if (input.trim() === "" || Number.isNaN(value)) {
            return singleError(
              new ValidationError({
                key: context.key,
                message: `Expected a number, received "${input}"`,
                code: "type_mismatch",
                value: input,
                suggestion: "Ensure the value is a numeric string or number.",
              }),
            )
          }
        } else {
          return singleError(
            new ValidationError({
              key: context.key,
              message: `Expected a number, received ${typeof input}`,
              code: "type_mismatch",
              value: input,
            }),
          )
        }

        if (!Number.isFinite(value)) {
          return singleError(
            new ValidationError({
              key: context.key,
              message: `Expected a finite number, received ${value}`,
              code: "invalid_value",
              value: input,
            }),
          )
        }

        return parseOk(value)
      },
      { typeLabel: "number" },
    ),
  ) as NumberValidator

  function refine(fn: (v: number) => string | undefined): NumberValidator {
    const original = base
    const wrapped = createValidator<number>((input: unknown, context: ParseContext) => {
      const result = original.parse(input, context)
      if (!result.success) return result
      const errorMsg = fn(result.value)
      if (errorMsg) {
        return singleError(
          new ValidationError({
            key: context.key,
            message: errorMsg,
            code: "invalid_value",
            value: result.value,
          }),
        )
      }
      return result
    }, original.metadata)
    return applyChain(wrapped) as NumberValidator
  }

  base.int = () =>
    refine((v) => (Number.isInteger(v) ? undefined : `Expected an integer, received ${v}`))

  base.positive = () =>
    refine((v) => (v > 0 ? undefined : `Expected a positive number, received ${v}`))

  base.port = () =>
    refine((v) =>
      Number.isInteger(v) && v >= 1 && v <= 65535
        ? undefined
        : `Expected a port number (1-65535), received ${v}`,
    )

  base.min = (value: number) =>
    refine((v) => (v >= value ? undefined : `Must be at least ${value}, received ${v}`))

  base.max = (value: number) =>
    refine((v) => (v <= value ? undefined : `Must be at most ${value}, received ${v}`))

  return base
}
