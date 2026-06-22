import type { Validator } from "./validator"

export interface SchemaDefinition {
  [key: string]: Validator<unknown>
}

export type ClientServerSchema<
  C extends SchemaDefinition = SchemaDefinition,
  S extends SchemaDefinition = SchemaDefinition,
> = {
  client: C
  server: S
}
