import { ValidationError } from "../../errors"
import type { Validator } from "../../types"
import type { ParseContext } from "../../types/validator"
import { singleError } from "../../types/validator"
import { createValidator } from "../factory"

export function port(): <T extends number | string>(v: Validator<T>) => Validator<T> {
  return <T extends number | string>(validator: Validator<T>): Validator<T> => {
    return createValidator<T>((input: unknown, context: ParseContext) => {
      const result = validator.parse(input, context)
      if (!result.success) return result
      const value = Number(result.value)
      if (Number.isInteger(value) && value >= 1 && value <= 65535) return result
      return singleError(
        new ValidationError({
          key: context.key,
          message: `Invalid port: "${result.value}" (expected 1-65535)`,
          code: "invalid_value",
          value: result.value,
        }),
      )
    }, validator.metadata)
  }
}
