import { ValidationError } from "../errors"
import type { Validator } from "../types"
import type { ParseContext } from "../types/validator"
import { parseOk, singleError } from "../types/validator"
import { applyChain, type ChainableMethods } from "./chain"
import { createValidator } from "./factory"

export interface StringValidator extends Validator<string>, ChainableMethods<string> {
  url(): StringValidator
  email(): StringValidator
  port(): StringValidator
  min(length: number): StringValidator
  max(length: number): StringValidator
  regex(pattern: RegExp, message?: string): StringValidator
}

export function string(): StringValidator {
  const base = applyChain(
    createValidator<string>(
      (input: unknown, context: ParseContext) => {
        if (typeof input !== "string") {
          return singleError(
            new ValidationError({
              key: context.key,
              message: `Expected a string, received ${typeof input}`,
              code: "type_mismatch",
              value: input,
              suggestion: "Ensure the value is wrapped in quotes.",
            }),
          )
        }
        return parseOk(input)
      },
      { typeLabel: "string" },
    ),
  ) as StringValidator

  function refine(fn: (v: string) => string | undefined): StringValidator {
    const original = base
    const wrapped = createValidator<string>((input: unknown, context: ParseContext) => {
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
    return applyChain(wrapped) as StringValidator
  }

  base.url = () =>
    refine((v) => {
      try {
        new URL(v)
        return undefined
      } catch {
        return "Invalid URL"
      }
    })

  base.email = () =>
    refine((v) => {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return re.test(v) ? undefined : "Invalid email address"
    })

  base.port = () =>
    refine((v) => {
      const n = Number(v)
      return Number.isInteger(n) && n >= 1 && n <= 65535 ? undefined : "Invalid port number"
    })

  base.min = (length: number) =>
    refine((v) => (v.length >= length ? undefined : `Must be at least ${length} characters`))

  base.max = (length: number) =>
    refine((v) => (v.length <= length ? undefined : `Must be at most ${length} characters`))

  base.regex = (pattern: RegExp, message?: string) =>
    refine((v) => {
      if (pattern.test(v)) return undefined
      return message ?? `Must match pattern ${pattern}`
    })

  return base
}
