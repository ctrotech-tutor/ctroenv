import { errInvalid, errType } from "../errors"
import type { Validator } from "../types"
import type { ParseContext } from "../types/validator"
import { parseOk, singleError } from "../types/validator"
import { applyChain, type ChainableMethods, type SpecificMethods } from "./chain"
import { createValidator } from "./factory"

export interface NumberValidator extends Validator<number>, ChainableMethods<number> {
  int(): NumberValidator
  positive(): NumberValidator
  port(): NumberValidator
  min(value: number): NumberValidator
  max(value: number): NumberValidator
  // T-preserving generic methods keep the specific chain going (only
  // .optional(), which widens T, ends it).
  default(value: number): NumberValidator
  describe(text: string): NumberValidator
  secret(): NumberValidator
  validate(
    fn: (value: number, context: { key: string; path: readonly string[] }) => string | undefined,
  ): NumberValidator
}

function numberBase(): Validator<number> {
  return createValidator<number>(
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
        return singleError(errType(context.key, typeof input, "a number", { originalValue: input }))
      }

      if (!Number.isFinite(value)) {
        return singleError(
          errInvalid(context.key, input, `Expected a finite number, received ${value}`),
        )
      }

      return parseOk(value)
    },
    { typeLabel: "number" },
  )
}

function wrapRefinement(
  current: Validator<number>,
  fn: (v: number) => string | undefined,
  typeLabel?: string,
): Validator<number> {
  return createValidator<number>(
    (input: unknown, context: ParseContext) => {
      const result = current.parse(input, context)
      if (!result.success) return result
      const errorMsg = fn(result.value)
      if (errorMsg) {
        return singleError(errInvalid(context.key, result.value, errorMsg))
      }
      return result
    },
    // .port() brands the label; pure constraints keep the current one.
    typeLabel === undefined ? current.metadata : { ...current.metadata, typeLabel },
  )
}

const numberMethods: SpecificMethods<number> = (current) => {
  const refine = (fn: (v: number) => string | undefined, typeLabel?: string): NumberValidator =>
    applyChain(wrapRefinement(current, fn, typeLabel), numberMethods) as NumberValidator

  return {
    int: () =>
      refine((v) => (Number.isInteger(v) ? undefined : `Expected an integer, received ${v}`)),

    positive: () =>
      refine((v) => (v > 0 ? undefined : `Expected a positive number, received ${v}`)),

    port: () =>
      refine(
        (v) =>
          Number.isInteger(v) && v >= 1 && v <= 65535
            ? undefined
            : `Expected a port number (1-65535), received ${v}`,
        "port",
      ),

    min: (value: number) =>
      refine((v) => (v >= value ? undefined : `Must be at least ${value}, received ${v}`)),

    max: (value: number) =>
      refine((v) => (v <= value ? undefined : `Must be at most ${value}, received ${v}`)),
  }
}

export function number(): NumberValidator {
  return applyChain(numberBase(), numberMethods) as NumberValidator
}
