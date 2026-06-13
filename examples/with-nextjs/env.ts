import { defineEnv } from "@ctroenv/nextjs"
import { schema } from "./schema"

export const env = defineEnv(schema)
