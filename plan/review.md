# ctroenv Review

## Purpose
Runtime environment variable resolution for browser and server apps with type coercion and schema validation. Used in Formit to inject Firebase config.

## Usage in Formit
```ts
// src/env.ts
import { defineEnv, string } from "@ctroenv/core"

export const env = defineEnv({
  VITE_FIREBASE_API_KEY: string().describe("Firebase API key"),
  VITE_FIREBASE_AUTH_DOMAIN: string().describe("Firebase auth domain"),
  VITE_FIREBASE_PROJECT_ID: string().describe("Firebase project ID"),
  // ...
})
```

## Package Architecture
- `@ctroenv/core` — defineEnv, validators (string, number, boolean, pick, ip, uuid, semver), error handling, schema composition, type inference
- `@ctroenv/cli` — CLI for env management / codegen
- `@ctroenv/nextjs` — server/client schema split for Next.js
- `@ctroenv/node` — Node.js adapter
- `@ctroenv/vite` — Vite adapter
- `@ctroenv/shared` — shared utilities

## Strengths
- **Full-featured schema system** — `defineEnv()` with chainable typed validators (`string().url()`, `string().email()`, `number().min(1)`, `.optional()`, `.default()`, `.isSecret()`)
- **Multi-runtime auto-detect** — resolves from `import.meta.env`, `process.env`, Deno, Bun in priority order
- **Configurable prefix** — `defineEnv(schema, { prefix: "VITE_" })`
- **Type inference** — `env.VITE_FIREBASE_API_KEY` is typed as `string` based on schema
- **Error handling** — `CtroEnvError`, `ValidationError`, proper error codes, formatter
- **Secret masking** — `.isSecret()` marks values masked as `********` in inspection/logs
- **CLI** — can generate/validate env files
- **Schema composition** — `defineSchema()` / `extendSchema()` for reusable schema fragments
- **Server/client split** — Next.js adapter handles public client vs secret server vars separately

## Issues & Risks

### 1. No type generation from `.env` file to schema
**Severity: LOW**

Types are inferred from the schema definition, which is good. But there's no way to generate a schema from `.env.example` or vice versa. Adding a new variable requires adding it in two places.

**Recommendation:** Add a `ctroenv init` CLI command that reads `.env.example` and generates a TypeScript schema stub.

### 2. Edge case: source detection fails silently in some environments
**Severity: LOW**

`detectSource()` tries `import.meta.env` → `Deno.env` → `Bun.env` → `process.env`. If none exist, it throws. In a web worker or extension context this could fail. The error message is clear though.

### 3. No live reload / HMR for env changes
**Severity: LOW**

`defineEnv()` runs once at module load. If env vars change during runtime (e.g., Electron or dynamic injection), the values are stale.

**Recommendation:** Offer a `watchEnv()` variant that re-parses schema and emits changes.

## Verdict
ctroenv is **more mature than initially assumed**. The schema-based `defineEnv()` with chainable validators, multi-runtime auto-detection, type inference, and error handling make it production-ready. The only gaps are minor DX improvements (CLI codegen, HMR). **Solid library — no urgent changes needed.**
