import type { ClientServerSchema } from "./schema"
import type { Validator } from "./validator"

type InferredValue<V extends Validator<unknown>> =
  V extends Validator<infer T>
    ? V["metadata"] extends { hasDefault: true }
      ? T
      : V["metadata"] extends { optional: true }
        ? T | undefined
        : T
    : never

export type InferredEnv<S extends Record<string, Validator<unknown>>> = {
  readonly [K in keyof S]: InferredValue<S[K]>
}

export type InferredClientServerEnv<S extends ClientServerSchema> = {
  readonly [K in keyof S["server"]]: S["server"][K] extends Validator<infer V> ? V : never
} & {
  readonly [K in keyof S["client"]]: S["client"][K] extends Validator<infer V> ? V : never
}
