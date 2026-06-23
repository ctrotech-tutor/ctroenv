import { errInvalid, errType } from "../errors"
import type { Validator } from "../types"
import type { ParseContext } from "../types/validator"
import { parseOk, singleError } from "../types/validator"
import { applyChain, type ChainableMethods } from "./chain"
import { createValidator } from "./factory"

export interface UuidValidator extends Validator<string>, ChainableMethods<string> {}

const UUID_RE =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const VALID_VERSIONS = new Set(["1", "2", "3", "4", "5", "6", "7", "8"])

export function uuid(options?: {
  version?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "any"
}): UuidValidator {
  const ver = options?.version ?? "any"
  const typeLabel = ver === "any" ? "UUID" : `UUIDv${ver}`

  const base = applyChain(
    createValidator<string>(
      (input: unknown, context: ParseContext) => {
        if (typeof input !== "string") {
          return singleError(errType(context.key, typeof input, typeLabel))
        }
        if (!UUID_RE.test(input)) {
          return singleError(errInvalid(context.key, input, "Must be a valid UUID"))
        }
        if (ver !== "any" && VALID_VERSIONS.has(ver)) {
          const verDigit = input[14]
          if (verDigit !== ver) {
            return singleError(errInvalid(context.key, input, `Must be a UUIDv${ver}`))
          }
        }
        return parseOk(input)
      },
      { typeLabel },
    ),
  ) as UuidValidator

  return base
}

export function guid(): UuidValidator {
  const base = applyChain(
    createValidator<string>(
      (input: unknown, context: ParseContext) => {
        if (typeof input !== "string") {
          return singleError(errType(context.key, typeof input, "GUID"))
        }
        if (!GUID_RE.test(input)) {
          return singleError(errInvalid(context.key, input, "Must be a valid GUID"))
        }
        return parseOk(input)
      },
      { typeLabel: "GUID" },
    ),
  ) as UuidValidator

  return base
}
