---
title: Define Once, Trust Everywhere — CtroEnv Deep Dive
published: false
description: A complete walkthrough of CtroEnv's validators, chainable methods, framework adapters, error system, and extensibility API.
tags: typescript, nodejs, tutorial, javascript, webdev
series: Mastering Environment Variables in TypeScript with CtroEnv
cover_image: https://ctroenv.vercel.app/og.png
---

In the [first article](./stop-using-processenv-directly-heres-why), we saw the problems with raw `process.env` and the basic idea of schema-based validation. Now let's go deep.

By the end of this article, you'll understand every validator, every chainable method, how the error system works, how to integrate with Node.js, Vite, and Next.js, and how to write custom validation logic.

---

## The Validator Family

CtroEnv has four factory functions, each returning a validator with its own set of refinement methods plus the shared chainable methods.

### `string()` — Text Values

The most common validator. Accepts any string input and provides refinements for format validation:

```typescript
import { string } from "@ctroenv/core"

const v = string()
  .url()                    // Must be a valid URL
  .email()                  // Must match email format
  .port()                   // Must be a port number (1-65535)
  .min(8)                   // Minimum length
  .max(256)                 // Maximum length
  .regex(/^[a-z]+$/, "Must be lowercase letters only")
```

Each refinement returns a new `StringValidator`, so they can be chained in any order. If the value fails any refinement, an `invalid_value` error is collected with a descriptive message like `"Invalid URL"` or `"Must be at least 8 characters"`.

### `number()` — Numeric Values

Accepts actual numbers or numeric strings. Coerces `"3000"` to `3000` automatically:

```typescript
import { number } from "@ctroenv/core"

const v = number()
  .int()                    // Must be an integer (no decimals)
  .positive()               // Must be > 0
  .port()                   // Must be between 1–65535
  .min(1)                   // Minimum value
  .max(100)                 // Maximum value
```

String coercion: `number()` calls `Number(input)` on strings. It rejects empty strings and anything that produces `NaN`. Floating point strings like `"3.14"` parse successfully but will fail `.int()`.

### `boolean()` — True/False Values

Accepts booleans directly, or coerces strings and numbers:

```typescript
import { boolean } from "@ctroenv/core"

const v = boolean()
// Accepts: true, false
// Coerces: "true" → true, "false" → false, "1" → true, "0" → false
// Coerces: 1 → true, 0 → false
// Rejects: everything else with suggestion "Use 'true', 'false', '1', or '0'."
```

This is especially useful for feature flags in `.env` files:

```
# .env
ENABLE_METRICS=true
SHOW_BETA_FEATURES=0
```

```typescript
const env = defineEnv({
  ENABLE_METRICS: boolean().default(false),
  SHOW_BETA_FEATURES: boolean().default(false),
})
// env.ENABLE_METRICS === true
// env.SHOW_BETA_FEATURES === false
```

### `pick()` — Enum Values

Restricts values to a specific set of allowed strings. The type is inferred as a union of literals:

```typescript
import { pick } from "@ctroenv/core"

const env = defineEnv({
  NODE_ENV: pick(["development", "staging", "production"] as const).default("development"),
  LOG_LEVEL: pick(["debug", "info", "warn", "error"] as const).default("info"),
})

env.NODE_ENV // "development" | "staging" | "production"
env.LOG_LEVEL // "debug" | "info" | "warn" | "error"
```

If someone types `"production"` (missing the 'c'), the error includes a suggestion:

```
NODE_ENV  Did you mean 'production'?
```

The `as const` assertion is important — it tells TypeScript to keep the literal types rather than widening to `string`.

---

## Chainable Methods

These methods are available on **every** validator, including custom ones built with `createValidator()`.

### `.default(value)` — Fallback When Not Set

If an env var is missing from the source, the default value is used instead of throwing:

```typescript
const v = number().default(3000)
// If PORT is not set, env.PORT === 3000
```

The inferred type is always the value type, never `T | undefined`:

```typescript
const env = defineEnv({ PORT: number().port().default(3000) })
env.PORT // number — always present
```

### `.optional()` — Allow Undefined

Marks a variable as not required. If missing, the value is `undefined`:

```typescript
const v = string().url().optional()

const env = defineEnv({
  SENTRY_DSN: string().url().optional().describe("Sentry error tracking DSN"),
})

env.SENTRY_DSN // string | undefined
```

### `.describe(text)` — Documentation Metadata

Attaches a description that appears in error messages and auto-generated documentation:

```typescript
string().url().describe("PostgreSQL connection URL")

// On validation error:
// Missing required environment variable: DATABASE_URL — PostgreSQL connection URL
```

Descriptions also appear in `ctroenv docs` output and `.env.example` comments.

### `.secret()` — Protect Sensitive Values

Flags a variable as sensitive. In the CLI output, secret values are masked (`••••••••`). In generated `.env.example` files, secret defaults are commented out. The runtime behavior is unchanged — the actual value is still accessible.

```typescript
string().min(32).secret().describe("JWT signing secret")
```

Note the order: `.min()` must come before `.secret()`. The `min`, `max`, `url`, `email`, `port`, and `regex` methods are defined on the specific validators (`StringValidator`, `NumberValidator`), while `secret`, `optional`, `default`, `describe`, and `validate` are from `ChainableMethods`. Once you call a chainable method, the return type narrows to `Validator<T> & ChainableMethods<T>`, which no longer includes the validator-specific refinements.

### `.validate(fn)` — Custom Inline Validation

For one-off validation rules that don't need a full custom validator:

```typescript
const env = defineEnv({
  API_KEY: string().validate((value) => {
    if (!value.startsWith("sk_")) return "Must start with 'sk_'"
    if (value.length < 40) return "Must be at least 40 characters"
    return undefined // validation passed
  }),
})
```

The function receives the parsed value and a context object with `key` and `path`. Return `undefined` for pass, or a string error message for failure.

---

## Standalone Refinements

Each refinement on `StringValidator` and `NumberValidator` is also available as a standalone function that wraps any validator:

```typescript
import { string, number, url, port, min, max, email, regex, integer } from "@ctroenv/core"

// These are equivalent:
string().url()
url()(string())

string().min(8)
min(8)(string())

number().int()
integer()(number())

number().port()
port()(number())
```

The standalone form is useful when you want to compose refinements from different validator types, or when building reusable validator factories.

---

## The Error System

When `defineEnv()` encounters validation failures, it collects every error and throws a single `CtroEnvError`. This is deliberate — fail fast, but tell the developer everything that's wrong at once.

### How Errors Are Structured

```typescript
class ValidationError {
  key: string           // "DATABASE_URL"
  message: string       // "Invalid URL"
  code: ErrorCode       // "missing_required" | "type_mismatch" | "invalid_value" | ...
  value: unknown        // The original (invalid) value
  suggestion?: string   // "Did you mean 'production'?" or fix instructions
}

class CtroEnvError extends Error {
  errors: readonly ValidationError[]
  // this.message = formatErrors(errors) — already formatted with colors
}
```

### Error Codes

```typescript
const ErrorCode = {
  MissingRequired: "missing_required",  // Var not set and no default
  TypeMismatch: "type_mismatch",        // Wrong type (e.g. string vs number)
  InvalidValue: "invalid_value",        // Failed a refinement (.url(), .min(), etc.)
  ValidationFailed: "validation_failed", // Custom .validate() returned a string
  CoercionFailed: "coercion_failed",    // Could not coerce (never used currently)
}
```

### The Formatted Output

The `formatErrors()` function produces the colored terminal output you saw in the first article. It groups errors into two sections:

```
 ● Missing required (2)

   DATABASE_URL  Add this variable to your .env file or set it in the environment.
   JWT_SECRET    Required — no default

 ✗ Invalid (1)

   CORS_ORIGIN
   Invalid URL

 → Define once. Trust everywhere.
```

It automatically detects terminal color support via `NO_COLOR`, `CI`, and `TERM=dumb` environment variables. In CI environments, colors are stripped and output is plain text.

### Programmatic Error Handling

You can catch `CtroEnvError` and inspect the errors programmatically:

```typescript
import { CtroEnvError } from "@ctroenv/core"

try {
  const env = defineEnv(schema)
} catch (e) {
  if (e instanceof CtroEnvError) {
    for (const err of e.errors) {
      console.error(`${err.key}: ${err.message}`)
      if (err.suggestion) console.error(`  → ${err.suggestion}`)
    }
  }
}
```

---

## Framework Adapters

CtroEnv provides adapters for the three most common JavaScript runtimes.

### Node.js — `@ctroenv/node`

Two source options:

```typescript
import { nodeSource, loadEnv } from "@ctroenv/node"
import { defineEnv } from "@ctroenv/core"

// Option A: Just process.env
const env = defineEnv(schema, { source: nodeSource() })

// Option B: Load .env files with priority
const env = defineEnv(schema, { source: loadEnv() })
```

`loadEnv()` reads files in order of increasing priority:

1. `.env`
2. `.env.{NODE_ENV}` (defaults to `development`)
3. `.env.local`

Each subsequent file overrides the previous. By default, `process.env` takes priority over file values (the `override: false` behavior), and missing keys don't fall back to `process.env` (unless `system: true` is set).

### Vite — `@ctroenv/vite`

Two integration points — a runtime source and a build plugin:

```typescript
// src/schema.ts
import { string, number } from "@ctroenv/core"
export const schema = {
  VITE_API_URL: string().url(),
  VITE_APP_PORT: number().port().default(5173),
}
```

```typescript
// vite.config.ts
import { defineConfig } from "vite"
import { ctroenvPlugin } from "@ctroenv/vite"

export default defineConfig({
  plugins: [
    ctroenvPlugin({
      schema: "./src/schema.ts", // or pass inline schema object
      failOnError: true,         // fail the build on invalid env
    }),
  ],
})
```

```typescript
// src/main.ts
import { defineEnv } from "@ctroenv/core"
import { viteSource } from "@ctroenv/vite"
import { schema } from "./schema"

const env = defineEnv(schema, { source: viteSource() })
```

The plugin runs during `buildStart` and validates all variables. With `failOnError: true`, `vite build` fails immediately if any variable is missing or invalid. The runtime source (`viteSource()`) reads from `import.meta.env` and falls back to `process.env`.

### Next.js — `@ctroenv/nextjs`

Next.js has a unique challenge: server-side code can access all environment variables, but client-side code can only access `NEXT_PUBLIC_*` variables. Accidentally exposing a server secret to the browser bundle is a common security issue.

```typescript
// schema.ts
import { string } from "@ctroenv/core"
import type { NextSchemaDefinition } from "@ctroenv/nextjs"

export const schema: NextSchemaDefinition = {
  server: {
    DATABASE_URL: string().url(),
    JWT_SECRET: string().secret().min(32),
    REDIS_URL: string().url(),
  },
  client: {
    NEXT_PUBLIC_API_URL: string().url(),
    NEXT_PUBLIC_APP_NAME: string().default("My App"),
  },
}
```

```typescript
// env.ts
import { defineEnv } from "@ctroenv/nextjs"
import { schema } from "./schema"

export const env = defineEnv(schema)
```

```typescript
// next.config.ts
import { withCtroEnv } from "@ctroenv/nextjs"
import { schema } from "./schema"

export default withCtroEnv(schema, { reactStrictMode: true })
```

The secret sauce is in the Proxy returned by `defineEnv()`. On the server, both `server` and `client` schemas are validated and accessible. On the client, only the `client` schema is validated. Accessing a server-only key (like `env.JWT_SECRET`) from client code throws a clear error:

```
Server-only environment variable "JWT_SECRET" is not accessible on the client.
Prefix it with NEXT_PUBLIC_ to expose it to the client bundle.
```

This prevents the most common Next.js security mistake — leaking server secrets to the browser — without requiring developers to maintain separate server and client env files.

---

## The EnvSource Abstraction

At the core of CtroEnv is a simple interface:

```typescript
interface EnvSource {
  get(key: string): string | undefined
}
```

Every adapter implements this interface differently:

| Source | What it reads |
|--------|--------------|
| `detectSource()` (default) | `process.env` → `import.meta.env` |
| `nodeSource()` | `process.env` |
| `loadEnv()` | `.env` files on disk |
| `viteSource()` | `import.meta.env` → `process.env` |
| Next.js `defineEnv()` | `process.env` (built-in) |

You can pass any object matching this interface to `defineEnv()`:

```typescript
const env = defineEnv(schema, {
  source: {
    get(key) {
      if (key === "DATABASE_URL") return "postgres://localhost:5432/db"
      if (key === "PORT") return "4000"
      return undefined
    },
  },
})
```

Or use `objectSource()` for flat objects:

```typescript
import { objectSource } from "@ctroenv/core"

const source = objectSource({
  DATABASE_URL: "postgres://localhost:5432/db",
  PORT: "4000",
})
```

---

## What `defineEnv()` Returns

The return value is a **deeply frozen** object. Every property is read-only at runtime:

```typescript
const env = defineEnv({ PORT: number().port().default(3000) })
env.PORT = 4000 // ❌ TypeError in strict mode (frozen object)
```

The deep freeze applies recursively — nested objects inside validated values are also frozen. This prevents accidental mutation of what should be immutable configuration.

---

## API Surface Summary

| Export | Kind | Package |
|--------|------|---------|
| `defineEnv` | Function | `@ctroenv/core` |
| `string` | Factory | `@ctroenv/core` |
| `number` | Factory | `@ctroenv/core` |
| `boolean` | Factory | `@ctroenv/core` |
| `pick` | Factory | `@ctroenv/core` |
| `createValidator` | Factory | `@ctroenv/core` |
| `applyChain` | Function | `@ctroenv/core` |
| `detectSource` | Function | `@ctroenv/core` |
| `objectSource` | Function | `@ctroenv/core` |
| `url`, `email`, `port`, `min`, `max`, `regex` | Refinements | `@ctroenv/core` |
| `integer`, `port`, `min`, `max` | Refinements | `@ctroenv/core` |
| `CtroEnvError` | Class | `@ctroenv/core` |
| `ValidationError` | Class | `@ctroenv/core` |
| `formatErrors` | Function | `@ctroenv/core` |
| `nodeSource`, `loadEnv` | Functions | `@ctroenv/node` |
| `viteSource`, `ctroenvPlugin` | Function + Plugin | `@ctroenv/vite` |
| `defineEnv`, `withCtroEnv` | Function | `@ctroenv/nextjs` |

---

## Coming Next

In [part 3](./monorepo-environment-management-at-scale), we'll look at managing environment variables in a monorepo — sharing schemas across packages, extending base configs, running validation in CI, and auto-generating documentation for every service.

---

*Resources:*
- 📖 [Full documentation](https://ctroenv.vercel.app)
- 📦 [@ctroenv/core on npm](https://www.npmjs.com/package/@ctroenv/core)
- ⭐ [GitHub](https://github.com/ctrotech-tutor/ctroenv)
