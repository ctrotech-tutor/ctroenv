export const ErrorCode = {
  MissingRequired: "missing_required",
  TypeMismatch: "type_mismatch",
  InvalidValue: "invalid_value",
  ValidationFailed: "validation_failed",
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]
