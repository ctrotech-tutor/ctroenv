import { ValidationError } from "../../errors"
import type { Validator } from "../../types"
import type { ParseContext } from "../../types/validator"
import { singleError } from "../../types/validator"
import { createValidator } from "../factory"

export function regex(
  pattern: RegExp,
  message?: string,
): <T extends string>(v: Validator<T>) => Validator<T> {
  return <T extends string>(validator: Validator<T>): Validator<T> => {
    return createValidator<T>((input: unknown, context: ParseContext) => {
      const result = validator.parse(input, context)
      if (!result.success) return result
      if (pattern.test(result.value as string)) return result
      return singleError(
        new ValidationError({
          key: context.key,
          message: message ?? `Must match pattern ${pattern}`,
          code: "invalid_value",
          value: result.value,
        }),
      )
    }, validator.metadata)
  }
}
