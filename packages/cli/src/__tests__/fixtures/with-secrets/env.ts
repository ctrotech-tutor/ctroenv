import { type SchemaDefinition, string } from "@ctroenv/core"

export const schema = {
  JWT_SECRET: string().secret().describe("JWT signing secret"),
  API_KEY: string().secret().describe("API key for external service"),
} satisfies SchemaDefinition
