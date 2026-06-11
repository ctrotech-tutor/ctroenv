import { formatErrors } from "./formatter"
import type { ValidationError } from "./validation-error"

export class CtroEnvError extends Error {
  readonly errors: readonly ValidationError[]

  constructor(errors: readonly ValidationError[]) {
    super(formatErrors(errors))
    this.name = "CtroEnvError"
    this.errors = errors
  }
}
