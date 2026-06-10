# Phase 3 — Framework Adapters

**Duration:** Week 6  
**Goal:** Runtime-agnostic adapters for Node.js, Vite, and Next.js, making CtroEnv work seamlessly in any environment.

---

## 3.1 Adapter Architecture

Each adapter is a thin package that:

1. **Provides the correct environment source** (auto-detected or explicit)
2. **Handles framework-specific behavior** (build-time validation, client/server split)
3. **Exports a framework-specific `defineEnv`** or a source preset

```
packages/
├── node/           # @ctroenv/node — process.env adapter
├── vite/           # @ctroenv/vite — import.meta.env adapter
└── nextjs/         # @ctroenv/nextjs — Next.js build-time adapter
```

---

## 3.2 @ctroenv/node

**Purpose:** Explicit Node.js adapter (auto-detected by core, but provides explicit config).

**Installation:**
```bash
npm install @ctroenv/node
```

**Usage:**
```ts
import { defineEnv } from "@ctroenv/core"
import { nodeSource } from "@ctroenv/node"

const env = defineEnv(
  { DATABASE_URL: string().url() },
  { source: nodeSource() },
)
```

**Or with auto-loading `.env` files:**
```ts
import { defineEnv } from "@ctroenv/core"
import { loadEnv } from "@ctroenv/node"

// Loads .env, .env.local, .env.production based on NODE_ENV
const source = loadEnv({ path: ".env", override: true })
const env = defineEnv(schema, { source })
```

### Implementation

```ts
// packages/node/src/index.ts
import { readFileSync, existsSync } from "node:fs"
import { parse } from "node:path"

export interface LoadEnvOptions {
  path?: string | string[]
  encoding?: BufferEncoding
  override?: boolean
  system?: boolean  // Also read from process.env
}

export function nodeSource(): EnvSource {
  return {
    get: (key: string) => process.env[key],
  }
}

export function loadEnv(opts?: LoadEnvOptions): EnvSource {
  // Parse .env files using dotenv format (manual, no dependency)
  // Priority: .env.local > .env.[NODE_ENV] > .env
  // Merge into a single source object
}
```

**Why no `dotenv` dependency:** We parse `.env` files ourselves. The format is simple (KEY=value lines, comments with `#`). This keeps the zero-dependency promise.

---

## 3.3 @ctroenv/vite

**Purpose:** Vite adapter that reads from `import.meta.env` and handles Vite's `VITE_` prefix convention.

**Installation:**
```bash
npm install @ctroenv/vite
```

**Usage:**
```ts
import { defineEnv } from "@ctroenv/core"
import { viteSource } from "@ctroenv/vite"

const env = defineEnv(
  {
    VITE_API_URL: string().url(),
    VITE_PUBLIC_KEY: string(),
  },
  { source: viteSource() },
)
```

**Or as a Vite plugin (for build-time validation):**

```ts
// vite.config.ts
import { ctroenvPlugin } from "@ctroenv/vite"

export default defineConfig({
  plugins: [
    ctroenvPlugin({
      schema: "./src/env.ts",
      // Fail build on validation error
      failOnError: true,
    }),
  ],
})
```

### Implementation

```ts
// packages/vite/src/index.ts

export function viteSource(): EnvSource {
  // Works at runtime via import.meta.env
  return {
    get: (key: string) => {
      if (typeof import.meta !== "undefined" && import.meta.env) {
        return import.meta.env[key]
      }
      // Fallback for SSR
      if (typeof process !== "undefined" && process.env) {
        return process.env[key]
      }
      return undefined
    },
  }
}

export function ctroenvPlugin(opts: {
  schema: string
  failOnError?: boolean
}): Plugin {
  return {
    name: "ctroenv",
    buildStart() {
      // Dynamic import schema, validate, throw on failure
    },
  }
}
```

---

## 3.4 @ctroenv/nextjs

**Purpose:** Next.js adapter with:
- Server/client variable separation
- Build-time validation
- Public variable prefix (`NEXT_PUBLIC_`)

**Installation:**
```bash
npm install @ctroenv/nextjs
```

**Usage:**
```ts
// src/env.ts
import { defineEnv } from "@ctroenv/nextjs"
import { string, number, pick } from "@ctroenv/core"

export const env = defineEnv({
  server: {
    DATABASE_URL: string().url(),
    JWT_SECRET: string().secret(),
  },
  client: {
    NEXT_PUBLIC_API_URL: string().url(),
    NEXT_PUBLIC_ANALYTICS_ID: string(),
  },
})
```

This mirrors the familiar t3-env pattern but without Zod and with all the CtroEnv extras.

### Client/Server Split Implementation

```ts
// packages/nextjs/src/index.ts

export function defineEnv<T extends NextSchemaDefinition>(
  schema: T,
): InferredNextEnv<T> {
  const { server, client } = schema

  if (typeof window === "undefined") {
    // Server-side: validate both server and client vars
    return validateAndMerge(server, client, process.env)
  } else {
    // Client-side: only validated client vars (NEXT_PUBLIC_*)
    return validateAndMerge({}, client, process.env)
  }
}
```

**Proxy safety:** Like t3-env, accessing server-only variables on the client throws a clear error:

```ts
const env = defineEnv({ server: { DATABASE_URL: ... }, client: {} })
env.DATABASE_URL  // Client-side: throws "Server-only variable"
```

### Build-Time Validation Plugin

```ts
// packages/nextjs/src/plugin.ts
import type { NextConfig } from "next"

export function withCtroEnv(nextConfig: NextConfig): NextConfig {
  return {
    ...nextConfig,
    webpack(config, options) {
      // Validate env at build time
      // Prevent server vars from leaking to client bundle
      return config
    },
  }
}
```

---

## 3.5 Testing Strategy

### Unit Tests (per adapter)
```ts
describe("@ctroenv/node", () => {
  it("reads from process.env", () => { /* ... */ })
  it("loads .env file", () => { /* ... */ })
  it("supports multiple env files with priority", () => { /* ... */ })
})

describe("@ctroenv/vite", () => {
  it("reads from import.meta.env", () => { /* ... */ })
  it("vite plugin fails build on error", () => { /* ... */ })
})

describe("@ctroenv/nextjs", () => {
  it("separates client and server vars", () => { /* ... */ })
  it("throws on client access to server vars", () => { /* ... */ })
  it("validates build-time", () => { /* ... */ })
})
```

### Integration Tests
- Create minimal test projects for each framework
- Use vitest with appropriate environments
- For Next.js, use `next build` in CI to verify build-time validation

---

## 3.6 Acceptance Criteria

- [ ] `@ctroenv/node` reads `process.env`
- [ ] `@ctroenv/node` parses `.env` files without dependencies
- [ ] `@ctroenv/vite` works at runtime with `import.meta.env`
- [ ] `@ctroenv/vite` plugin validates at build time
- [ ] `@ctroenv/nextjs` separates client/server variables
- [ ] `@ctroenv/nextjs` proxies server vars on client with clear error
- [ ] All adapters pass strict TypeScript checks
- [ ] All adapters have ≥ 90% test coverage

---

## 3.7 Out of Scope for Phase 3

- ESLint plugin (Phase 5)
- VSCode extension (Phase 5)
- Docker adapter
- Cloudflare Workers adapter
- Remix, SvelteKit, Astro adapters (post-v1)
