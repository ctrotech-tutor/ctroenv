import { errInvalid, errType } from "../errors"
import type { Validator } from "../types"
import type { ParseContext } from "../types/validator"
import { parseOk, singleError } from "../types/validator"
import { applyChain, type ChainableMethods } from "./chain"
import { createValidator } from "./factory"

export interface IpValidator extends Validator<string>, ChainableMethods<string> {}

const IPV4_RE = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/

function isIPv6(str: string): boolean {
  if (str.includes("%")) return false
  try {
    const hostname = new URL(`http://[${str}]`).hostname
    return hostname.startsWith("[") && hostname.endsWith("]")
  } catch {
    return false
  }
}

export function ip(options?: { version?: "4" | "6" | "both" }): IpValidator {
  const version = options?.version ?? "both"
  const typeLabel = version === "both" ? "IP address" : `IPv${version}`
  const errMsg = `Must be a valid IP${version === "both" ? "" : `v${version}`} address`

  const base = applyChain(
    createValidator<string>(
      (input: unknown, context: ParseContext) => {
        if (typeof input !== "string") {
          return singleError(errType(context.key, typeof input, typeLabel))
        }

        const isV4 = IPV4_RE.test(input)
        const isV6 = isIPv6(input)

        if (version === "4" && isV4) return parseOk(input)
        if (version === "6" && isV6) return parseOk(input)
        if (version === "both" && (isV4 || isV6)) return parseOk(input)

        return singleError(errInvalid(context.key, input, errMsg))
      },
      { typeLabel },
    ),
  ) as IpValidator

  return base
}

export function ipv4(): IpValidator {
  return ip({ version: "4" })
}

export function ipv6(): IpValidator {
  return ip({ version: "6" })
}
