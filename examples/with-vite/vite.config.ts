import { defineConfig } from "vite"
import { ctroenvPlugin } from "@ctroenv/vite"

export default defineConfig({
  plugins: [
    ctroenvPlugin({
      schema: "./src/schema.ts",
      failOnError: true,
    }),
  ],
})
