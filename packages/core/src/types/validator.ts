import type { ValidationError } from "../errors/validation-error"

export interface Validator<T> {
  readonly _type: T
  parse(input: unknown, context: ParseContext): ParseResult<T>
  readonly metadata: ValidatorMetadata
}

export interface ParseContext {
  key: string
  path: readonly string[]
}

export interface ParseResultOk<T> {
  success: true
  value: T
  errors: readonly ValidationError[]
}

export interface ParseResultFail {
  success: false
  value?: unknown
  errors: readonly ValidationError[]
}

export type ParseResult<T> = ParseResultOk<T> | ParseResultFail

export function parseOk<T>(value: T): ParseResultOk<T> {
  return { success: true as const, value, errors: [] }
}

export function parseFail(errors: readonly ValidationError[]): ParseResultFail {
  return { success: false as const, errors }
}

export function singleError(err: ValidationError): ParseResultFail {
  return parseFail([err])
}

export interface ValidatorMetadata {
  description?: string
  optional: boolean
  hasDefault: boolean
  defaultValue?: unknown
  isSecret: boolean
  typeLabel: string
}
