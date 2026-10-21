import { errInvalid, errType } from "../errors"
import type { Validator } from "../types"
import type { ParseContext } from "../types/validator"
import { parseOk, singleError } from "../types/validator"
import { applyChain, type ChainableMethods, type SpecificMethods } from "./chain"
import { createValidator } from "./factory"

export interface StringValidator extends Validator<string>, ChainableMethods<string> {
  url(): StringValidator
  email(): StringValidator
  hostname(): StringValidator
  port(): StringValidator
  min(length: number): StringValidator
  max(length: number): StringValidator
  regex(pattern: RegExp, message?: string): StringValidator
  // T-preserving generic methods keep the specific chain going (only
  // .optional(), which widens T, ends it).
  default(value: string): StringValidator
  describe(text: string): StringValidator
  secret(): StringValidator
  validate(
    fn: (value: string, context: { key: string; path: readonly string[] }) => string | undefined,
  ): StringValidator
}

function stringBase(): Validator<string> {
  return createValidator<string>(
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
  )
}

function wrapRefinement(
  current: Validator<string>,
  fn: (v: string) => string | undefined,
  typeLabel?: string,
): Validator<string> {
  return createValidator<string>(
    (input: unknown, context: ParseContext) => {
      const result = current.parse(input, context)
      if (!result.success) return result
      const errorMsg = fn(result.value)
      if (errorMsg) {
        return singleError(errInvalid(context.key, result.value, errorMsg))
      }
      return result
    },
    // Format refinements (url, email, …) brand the label; pure constraints
    // (min, max, regex) keep the current one.
    typeLabel === undefined ? current.metadata : { ...current.metadata, typeLabel },
  )
}

const stringMethods: SpecificMethods<string> = (current) => {
  const refine = (fn: (v: string) => string | undefined, typeLabel?: string): StringValidator =>
    applyChain(wrapRefinement(current, fn, typeLabel), stringMethods) as StringValidator

  return {
    url: () =>
      refine((v) => {
        try {
          const parsed = new URL(v)
          if (!parsed.protocol || parsed.protocol === "file:") return "Invalid URL"
          return undefined
        } catch {
          return "Invalid URL"
        }
      }, "url"),

    email: () =>
      refine((v) => {
        const re =
          /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
        return re.test(v) ? undefined : "Invalid email address"
      }, "email"),

    hostname: () =>
      refine((v) => {
        if (v.length > 253) return "Hostname too long (max 253 characters)"
        const labels = v.replace(/\.$/, "").split(".")
        if (labels.some((l) => l.length === 0)) return "Invalid hostname: empty label"
        for (const label of labels) {
          if (label.length > 63) return `Hostname label too long: "${label}" (max 63)`
          if (!/^[a-zA-Z0-9]/.test(label))
            return `Hostname label must start with alphanumeric: "${label}"`
          if (!/[a-zA-Z0-9]$/.test(label))
            return `Hostname label must end with alphanumeric: "${label}"`
          if (/[^a-zA-Z0-9-]/.test(label))
            return `Hostname label contains invalid characters: "${label}"`
        }
        return undefined
      }, "hostname"),

    port: () =>
      refine((v) => {
        const n = Number(v)
        return Number.isInteger(n) && n >= 1 && n <= 65535 ? undefined : "Invalid port number"
      }, "port"),

    min: (length: number) =>
      refine((v) => (v.length >= length ? undefined : `Must be at least ${length} characters`)),

    max: (length: number) =>
      refine((v) => (v.length <= length ? undefined : `Must be at most ${length} characters`)),

    regex: (pattern: RegExp, message?: string) =>
      refine((v) => {
        if (pattern.test(v)) return undefined
        return message ?? `Must match pattern ${pattern}`
      }),
  }
}

export function string(): StringValidator {
  return applyChain(stringBase(), stringMethods) as StringValidator
}
