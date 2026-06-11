import { ValidationError } from "../../errors"
import type { Validator } from "../../types"
import type { ParseContext } from "../../types/validator"
import { singleError } from "../../types/validator"
import { createValidator } from "../factory"

export function min<N extends number>(
  limit: N,
): {
  <T extends string>(v: Validator<T>): Validator<T>
  <T extends number>(v: Validator<T>): Validator<T>
} {
  function refine<T>(validator: Validator<T>): Validator<T> {
    return createValidator<T>((input: unknown, context: ParseContext) => {
      const result = validator.parse(input, context)
      if (!result.success) return result
      const v = result.value as unknown as number | string
      const valid =
        typeof v === "number" ? v >= limit : typeof v === "string" ? v.length >= limit : true
      if (valid) return result
      return singleError(
        new ValidationError({
          key: context.key,
          message: `Must be at least ${limit}, received ${v}`,
          code: "invalid_value",
          value: result.value,
        }),
      )
    }, validator.metadata)
  }
  return refine as ReturnType<typeof min<N>>
}
