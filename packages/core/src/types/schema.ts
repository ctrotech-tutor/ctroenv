import type { Validator } from "./validator"

export interface SchemaDefinition {
  [key: string]: Validator<unknown>
}
