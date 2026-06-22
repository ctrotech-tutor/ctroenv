import { errInvalid, errType } from "../errors"
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
          const trimmed = input.trim()
          if (!/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
            return singleError(
              errType(context.key, `"${input}"`, "a number", {
                suggestion:
                  "Use a plain number like '3000' or '3.14'. Hex (0xFF), scientific (1e2), and empty strings are not accepted.",
                originalValue: input,
              }),
            )
          }
          value = Number(trimmed)
        } else {
          return singleError(
            errType(context.key, typeof input, "a number", { originalValue: input }),
          )
        }

        if (!Number.isFinite(value)) {
          return singleError(
            errInvalid(context.key, input, `Expected a finite number, received ${value}`),
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
        return singleError(errInvalid(context.key, result.value, errorMsg))
      }
      return result
    }, original.metadata)
    return applyChain(
      Object.assign(wrapped, {
        int: original.int,
        positive: original.positive,
        port: original.port,
        min: original.min,
        max: original.max,
      }),
    ) as NumberValidator
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
