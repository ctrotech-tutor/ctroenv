import { number, pick, type SchemaDefinition, string } from "@ctroenv/core"

export const schema = {
  DATABASE_URL: string().url(),
  PORT: number().port(),
  NODE_ENV: pick(["development", "production", "test"] as const),
} satisfies SchemaDefinition
