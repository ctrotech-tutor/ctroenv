import { type SchemaDefinition, string } from "@ctroenv/core"

export const schema = {
  GREETING: string().default("hello"),
} satisfies SchemaDefinition
