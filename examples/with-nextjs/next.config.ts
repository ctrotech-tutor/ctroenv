import { withCtroEnv } from "@ctroenv/nextjs"
import { schema } from "./schema"

export default withCtroEnv(schema, {
  reactStrictMode: true,
})
