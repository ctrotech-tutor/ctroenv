import { errType } from "../errors"
import type { Validator } from "../types"
import type { ParseContext } from "../types/validator"
import { parseOk, singleError } from "../types/validator"
import { applyChain, type ChainableMethods } from "./chain"
import { createValidator } from "./factory"

export interface BooleanValidator extends Validator<boolean>, ChainableMethods<boolean> {}

export function boolean(): BooleanValidator {
  const base = applyChain(
    createValidator<boolean>(
      (input: unknown, context: ParseContext) => {
        if (typeof input === "boolean") {
          return parseOk(input)
        }
        if (typeof input === "string") {
          const lower = input.trim().toLowerCase()
          if (
            lower === "true" ||
            lower === "1" ||
            lower === "yes" ||
            lower === "on" ||
            lower === "y" ||
            lower === "t"
          )
            return parseOk(true)
          if (
            lower === "false" ||
            lower === "0" ||
            lower === "no" ||
            lower === "off" ||
            lower === "n" ||
            lower === "f"
          )
            return parseOk(false)
        }
        if (typeof input === "number") {
          if (input === 1) return parseOk(true)
          if (input === 0) return parseOk(false)
        }
        return singleError(
          errType(
            context.key,
            typeof input === "string" ? `"${input}"` : typeof input,
            "a boolean",
            {
              suggestion: "Use 'true', 'false', 'yes', 'no', '1', '0', 'y', or 'n'.",
              originalValue: input,
            },
          ),
        )
      },
      { typeLabel: "boolean" },
    ),
  ) as BooleanValidator

  return base
}
