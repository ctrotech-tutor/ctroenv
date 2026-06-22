import { errInvalid, errType } from "../errors"
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
            errType(
              context.key,
              typeof input === "string" ? `"${input}"` : typeof input,
              "a string",
              {
                suggestion: "Ensure the value is wrapped in quotes.",
                originalValue: input,
              },
            ),
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
        return singleError(errInvalid(context.key, result.value, errorMsg))
      }
      return result
    }, original.metadata)
    return applyChain(
      Object.assign(wrapped, {
        url: original.url,
        email: original.email,
        port: original.port,
        min: original.min,
        max: original.max,
        regex: original.regex,
      }),
    ) as StringValidator
  }

  base.url = () =>
    refine((v) => {
      try {
        const parsed = new URL(v)
        if (!parsed.protocol || parsed.protocol === "file:") return "Invalid URL"
        return undefined
      } catch {
        return "Invalid URL"
      }
    })

  base.email = () =>
    refine((v) => {
      const re =
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
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
