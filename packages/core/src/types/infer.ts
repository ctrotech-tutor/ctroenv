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
