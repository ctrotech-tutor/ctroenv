import type { ErrorCode } from "./error-codes"
import { ValidationError } from "./validation-error"

export interface MessageOptions {
  suggestion?: string | undefined
  description?: string | undefined
}

export function errMissing(key: string, opts?: MessageOptions): ValidationError {
  return new ValidationError({
    key,
    message: opts?.description
      ? `Missing required environment variable: ${key} — ${opts.description}`
      : `Missing required environment variable: ${key}`,
    code: "missing_required",
    suggestion:
      opts?.suggestion ?? "Add this variable to your .env file or set it in the environment.",
  })
}

export function errType(
  key: string,
  received: string,
  expected: string,
  opts?: MessageOptions & { originalValue?: unknown },
): ValidationError {
  const msg = received.startsWith('"')
    ? `Expected ${expected}, received ${received}`
    : `Expected ${expected}, received ${received}`
  return new ValidationError({
    key,
    message: msg,
    code: "type_mismatch",
    value: opts?.originalValue,
    suggestion: opts?.suggestion,
  })
}

export function errInvalid(
  key: string,
  value: unknown,
  message: string,
  opts?: MessageOptions,
): ValidationError {
  return new ValidationError({
    key,
    message,
    code: "invalid_value",
    value,
    suggestion: opts?.suggestion,
  })
}

export function errWrap(
  key: string,
  value: unknown,
  message: string,
  code: ErrorCode,
  opts?: MessageOptions,
): ValidationError {
  return new ValidationError({
    key,
    message,
    code,
    value,
    suggestion: opts?.suggestion,
  })
}
