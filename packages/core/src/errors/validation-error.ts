import type { ErrorCode } from "./error-codes"

export class ValidationError {
  readonly key: string
  readonly message: string
  readonly code: ErrorCode
  readonly value: unknown | undefined
  readonly suggestion: string | undefined

  constructor(opts: {
    key: string
    message: string
    code: ErrorCode
    value?: unknown
    suggestion?: string | undefined
  }) {
    this.key = opts.key
    this.message = opts.message
    this.code = opts.code
    this.value = opts.value
    this.suggestion = opts.suggestion
  }
}
