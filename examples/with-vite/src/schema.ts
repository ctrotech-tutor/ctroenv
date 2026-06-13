import { string, number, boolean } from "@ctroenv/core"

export const schema = {
  VITE_API_URL: string().url().describe("Backend API URL"),
  VITE_APP_NAME: string().default("CtroEnv Demo"),
  VITE_APP_PORT: number().port().default(5173),
  VITE_FEATURE_DARK_MODE: boolean().default(true),
  VITE_SENTRY_DSN: string().url().optional().describe("Sentry error tracking DSN"),
}
