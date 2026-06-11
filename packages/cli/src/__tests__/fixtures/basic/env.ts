import { number, pick, type SchemaDefinition, string } from "@ctroenv/core"

export const schema = {
  DATABASE_URL: string().url().describe("Database connection URL"),
  PORT: number().port().default(3000).describe("Server port"),
  NODE_ENV: pick(["development", "production", "test"] as const).default("development"),
} satisfies SchemaDefinition
