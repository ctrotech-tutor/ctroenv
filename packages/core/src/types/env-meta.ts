import type { SchemaDefinition } from "./schema"
import type { Validator } from "./validator"

export interface EnvMeta {
  /**
   * Read the raw (unmasked) value for a key — the explicit accessor for
   * secret values. Never pass its result to logs or serialization.
   */
  get(key: string): string | undefined
  has(key: string): boolean
  keys(): string[]
  /** Serialize all values with secrets masked. Safe for `JSON.stringify`. */
  toJSON(): Record<string, string | undefined>
}

export type EnvResult<T extends SchemaDefinition> = {
  readonly [K in keyof T]: T[K] extends Validator<infer V> ? V : never
} & { readonly meta: EnvMeta }
