import type { SchemaDefinition } from "./schema"
import type { Validator } from "./validator"

export interface EnvMeta {
  get(key: string): unknown
  has(key: string): boolean
  keys(): string[]
  toJSON(): Record<string, string | undefined>
}

export type EnvResult<T extends SchemaDefinition> = {
  readonly [K in keyof T]: T[K] extends Validator<infer V> ? V : never
} & { readonly meta: EnvMeta }
