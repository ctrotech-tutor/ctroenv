import { ValidationError } from "../errors"
import type { Validator } from "../types"
import { singleError } from "../types/validator"

export interface ChainableMethods<T> {
  optional(): Validator<T | undefined>
  default(value: T): Validator<T>
  describe(text: string): Validator<T>
  secret(): Validator<T>
  validate(
    fn: (value: T, context: { key: string; path: readonly string[] }) => string | undefined,
  ): Validator<T>
}

export function applyChain<T>(validator: Validator<T>): Validator<T> & ChainableMethods<T> {
  function withNewMetadata(overrides: Partial<Validator<T>["metadata"]>): Validator<T> {
    return {
      _type: validator._type,
      parse(input, context) {
        return validator.parse(input, context)
      },
      metadata: { ...validator.metadata, ...overrides },
    }
  }

  const chainable = validator as Validator<T> & ChainableMethods<T>

  chainable.optional = () =>
    applyChain(withNewMetadata({ optional: true, hasDefault: false })) as unknown as Validator<
      T | undefined
    > &
      ChainableMethods<T | undefined>

  chainable.default = (value: T) =>
    applyChain(
      withNewMetadata({ hasDefault: true, defaultValue: value, optional: false }),
    ) as unknown as Validator<T> & ChainableMethods<T>

  chainable.describe = (text: string) => applyChain(withNewMetadata({ description: text }))

  chainable.secret = () => applyChain(withNewMetadata({ isSecret: true }))

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
    return applyChain(wrapped)
  }

  return chainable
}
