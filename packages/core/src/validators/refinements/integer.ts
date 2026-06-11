import { ValidationError } from "../../errors"
import type { Validator } from "../../types"
import type { ParseContext } from "../../types/validator"
import { singleError } from "../../types/validator"
import { createValidator } from "../factory"

export function integer<T extends number>(): (v: Validator<T>) => Validator<T> {
  return (validator: Validator<T>): Validator<T> => {
    return createValidator<T>((input: unknown, context: ParseContext) => {
      const result = validator.parse(input, context)
      if (!result.success) return result
      if (Number.isInteger(result.value)) return result
      return singleError(
        new ValidationError({
          key: context.key,
          message: `Expected an integer, received ${result.value}`,
          code: "invalid_value",
          value: result.value,
        }),
      )
    }, validator.metadata)
  }
}
