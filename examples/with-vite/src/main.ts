import { defineEnv } from "@ctroenv/core"
import { viteSource } from "@ctroenv/vite"
import { schema } from "./schema"

const env = defineEnv(schema, { source: viteSource() })

const app = document.querySelector<HTMLDivElement>("#app")!

app.innerHTML = `
  <h1>${env.VITE_APP_NAME}</h1>
  <p>API URL: <code>${env.VITE_API_URL}</code></p>
  <p>Port: <code>${env.VITE_APP_PORT}</code></p>
  <p>Dark mode: <code>${env.VITE_FEATURE_DARK_MODE}</code></p>
  ${env.VITE_SENTRY_DSN ? `<p>✓ Sentry error tracking enabled</p>` : ""}
`
