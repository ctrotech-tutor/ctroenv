import type { SchemaDefinition } from "../types"

export type Schema<T extends SchemaDefinition> = T

export function defineSchema<T extends SchemaDefinition>(schema: T): Schema<T> {
  return schema
}

export function extendSchema<
  T extends SchemaDefinition,
  U extends SchemaDefinition,
>(base: Schema<T>, extension: U): Schema<T & U> {
  const conflicts = Object.keys(base).filter((k) => k in extension)
  if (conflicts.length > 0 && process.env.NODE_ENV === "development") {
    console.warn(
      `[ctroenv] extendSchema: keys overridden in extension — ${conflicts.join(", ")}`,
    )
  }
  return { ...base, ...extension }
}
