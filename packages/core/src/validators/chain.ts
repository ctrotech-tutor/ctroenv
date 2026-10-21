import { ValidationError } from "../errors"
import type { Validator } from "../types"
import { singleError } from "../types/validator"

export interface ChainableMethods<T> {
  optional(): Validator<T | undefined> & ChainableMethods<T | undefined>
  default(value: T): Validator<T> & ChainableMethods<T>
  describe(text: string): Validator<T> & ChainableMethods<T>
  secret(): Validator<T> & ChainableMethods<T>
  validate(
    fn: (value: T, context: { key: string; path: readonly string[] }) => string | undefined,
  ): Validator<T> & ChainableMethods<T>
}

export type SpecificMethods<T> = (current: Validator<T>) => Record<string, (...args: never[]) => unknown>

/**
 * Attach the generic chain methods (`.optional()`, `.default()`, …) to a
 * validator. Builders with type-specific methods (`.min()`, `.url()`, …)
 * pass a `methods` factory so every step rebinds fresh methods closing over
 * the current validator — refinements then compose in any order, and only
 * `.optional()` (which widens `T`, like Zod) ends the specific chain.
 */
export function applyChain<T>(
  validator: Validator<T>,
  methods?: SpecificMethods<T>,
): Validator<T> & ChainableMethods<T> {
  const chainable = validator as Validator<T> & ChainableMethods<T>
  if (methods) {
    Object.assign(chainable, methods(validator))
  }

  function step(
    overrides: Partial<Validator<T>["metadata"]>,
    preserveMethods: boolean,
  ): Validator<T> & ChainableMethods<T> {
    const next: Validator<T> = {
      _type: validator._type,
      parse(input, context) {
        return validator.parse(input, context)
      },
      metadata: { ...validator.metadata, ...overrides },
    }
    return applyChain(next, preserveMethods ? methods : undefined)
  }

  // .optional() widens T and ends the specific chain (no methods rebound).
  chainable.optional = () =>
    step({ optional: true, hasDefault: false }, false) as unknown as Validator<T | undefined> &
      ChainableMethods<T | undefined>

  chainable.default = (value: T) => {
    if (process.env.NODE_ENV === "development") {
      const result = validator.parse(value as unknown as string, {
        key: ".default()",
        path: [],
      })
      if (!result.success) {
        console.warn(
          `[ctroenv] Default value "${String(value)}" fails validation: ${result.errors[0]?.message ?? "unknown error"}`,
        )
      }
    }
    return step({ hasDefault: true, defaultValue: value, optional: false }, true)
  }

  chainable.describe = (text: string) => step({ description: text }, true)

  chainable.secret = () => step({ isSecret: true }, true)

  chainable.validate = (
    fn: (value: T, context: { key: string; path: readonly string[] }) => string | undefined,
  ) => {
    const original = validator
    const wrapped: Validator<T> = {
      _type: original._type,
      parse(input, context) {
        const result = original.parse(input, context)
        if (!result.success) return result
        const message = fn(result.value, context)
        if (message) {
          return singleError(
            new ValidationError({
              key: context.key,
              message,
              code: "validation_failed",
              value: result.value,
            }),
          )
        }
        return result
      },
      metadata: original.metadata,
    }
    return applyChain(wrapped, methods)
  }

  return chainable
}
