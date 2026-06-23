import { errInvalid, errType } from "../errors"
import type { Validator } from "../types"
import type { ParseContext } from "../types/validator"
import { parseOk, singleError } from "../types/validator"
import { applyChain, type ChainableMethods } from "./chain"
import { createValidator } from "./factory"

export interface SemverValidator extends Validator<string>, ChainableMethods<string> {}

export function semver(): SemverValidator {
  const RE =
    /^\d+\.\d+\.\d+(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/

  const base = applyChain(
    createValidator<string>(
      (input: unknown, context: ParseContext) => {
        if (typeof input !== "string") {
          return singleError(errType(context.key, typeof input, "semver"))
        }
        if (RE.test(input)) return parseOk(input)
        return singleError(
          errInvalid(context.key, input, "Must be a valid semver version (e.g. 1.2.3)"),
        )
      },
      { typeLabel: "semver" },
    ),
  ) as SemverValidator

  return base
}
