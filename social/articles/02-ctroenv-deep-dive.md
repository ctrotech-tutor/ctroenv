---
title: Define Once, Trust Everywhere — CtroEnv Deep Dive
description: A complete walkthrough of CtroEnv's validators, chainable methods, framework adapters, error system, and extensibility API.
tags: typescript, nodejs, tutorial, javascript, webdev
series: Mastering Environment Variables in TypeScript with CtroEnv
---

The core API is just four validator factories. Here's how they work and when to use each one.

## The Four Validators

### `string()` — Text Values

The most common one. Accepts any string input with refinements for format validation:

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

Each refinement returns a new `StringValidator`, so they chain in any order. Fail any refinement and you get an `invalid_value` error with a message like `"Invalid URL"` or `"Must be at least 8 characters"`.

### `number()` — Numeric Values

Accepts numbers or numeric strings. Coerces `"3000"` to `3000`:

```typescript
import { number } from "@ctroenv/core"

const v = number()
  .int()                    // Must be an integer
  .positive()               // Must be > 0
  .port()                   // Must be between 1-65535
  .min(1)                   // Minimum value
  .max(100)                 // Maximum value
```

`number()` calls `Number(input)` on strings. It rejects empty strings and anything producing `NaN`. `"3.14"` parses fine but fails `.int()`.

### `boolean()` — True/False Values

Accepts booleans directly, coerces strings and numbers:

```typescript
import { boolean } from "@ctroenv/core"

const v = boolean()
// Accepts: true, false
// Coerces: "true" -> true, "false" -> false, "1" -> true, "0" -> false
// Coerces: 1 -> true, 0 -> false
// Rejects: everything else
```

Useful for feature flags:

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

Restricts to a set of allowed strings. The type is inferred as a union of literals:

```typescript
import { pick } from "@ctroenv/core"

const env = defineEnv({
  NODE_ENV: pick(["development", "staging", "production"] as const).default("development"),
  LOG_LEVEL: pick(["debug", "info", "warn", "error"] as const).default("info"),
})

env.NODE_ENV // "development" | "staging" | "production"
env.LOG_LEVEL // "debug" | "info" | "warn" | "error"
```

Typo `"production"` (missing the 'c')? The error includes a suggestion:

```
NODE_ENV  Did you mean 'production'?
```

The `as const` assertion is critical — it keeps the literal types instead of widening to `string`.

## Chainable Methods

Available on every validator, including custom ones built with `createValidator()`.

### `.default(value)` — Fallback When Not Set

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

```typescript
const v = string().url().optional()

const env = defineEnv({
  SENTRY_DSN: string().url().optional().describe("Sentry error tracking DSN"),
})

env.SENTRY_DSN // string | undefined
```

### `.describe(text)` — Documentation Metadata

Attaches a description for error messages and auto-generated docs:

```typescript
string().url().describe("PostgreSQL connection URL")

// Missing required environment variable: DATABASE_URL — PostgreSQL connection URL
```

Descriptions also appear in `ctroenv docs` output and `.env.example` comments.

### `.secret()` — Protect Sensitive Values

Flags a variable as sensitive. Values are masked (`********`) in CLI output and commented out in `.env.example`. The runtime value is still accessible normally.

```typescript
string().min(32).secret().describe("JWT signing secret")
```

Order matters: `.min()` must come before `.secret()`. The type-specific methods (`min`, `max`, `url`, `email`, `port`, `regex`) live on `StringValidator` and `NumberValidator`. Chainable methods (`secret`, `optional`, `default`, `describe`, `validate`) return `Validator<T> & ChainableMethods<T>`, which doesn't include the type-specific refinements.

### `.validate(fn)` — Custom Inline Validation

For one-off rules that don't need a full custom validator:

```typescript
const env = defineEnv({
  API_KEY: string().validate((value) => {
    if (!value.startsWith("sk_")) return "Must start with 'sk_'"
    if (value.length < 40) return "Must be at least 40 characters"
    return undefined // pass
  }),
})
```

The function receives the parsed value and a context object. Return `undefined` for pass, or a string error message for failure.

## Standalone Refinements

Each refinement on `StringValidator` and `NumberValidator` is also available as a standalone function:

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

Useful for composing refinements from different validator types or building reusable validator factories.

## The Error System

When `defineEnv()` encounters failures, it collects every error and throws a single `CtroEnvError`. Fail fast, but tell the developer everything wrong at once.

### How Errors Are Structured

```typescript
class ValidationError {
  key: string           // "DATABASE_URL"
  message: string       // "Invalid URL"
  code: ErrorCode       // "missing_required" | "type_mismatch" | "invalid_value" | ...
  value: unknown        // The original (invalid) value
  suggestion?: string   // "Did you mean 'production'?"
}
```

### Error Codes

| Code | When |
|------|------|
| `missing_required` | Var not set and no default |
| `type_mismatch` | Wrong type (string vs number, etc.) |
| `invalid_value` | Failed a refinement (.url(), .min(), etc.) |
| `validation_failed` | Custom .validate() returned an error |
| `coercion_failed` | Could not coerce (string "foo" to number) |

### Formatted Output

`formatErrors()` produces grouped, colored terminal output:

```
 ● Missing required (2)

   DATABASE_URL  Add this variable to your .env file or set it in the environment.
   JWT_SECRET    Required — no default

 ✗ Invalid (1)

   CORS_ORIGIN
   Invalid URL
```

It detects `NO_COLOR`, `CI`, and `TERM=dumb` — in CI, colors are stripped automatically.

### Programmatic Error Handling

```typescript
import { CtroEnvError } from "@ctroenv/core"

try {
  const env = defineEnv(schema)
} catch (e) {
  if (e instanceof CtroEnvError) {
    for (const err of e.errors) {
      console.error(`${err.key}: ${err.message}`)
      if (err.suggestion) console.error(`  -> ${err.suggestion}`)
    }
  }
}
```

## Framework Adapters

### Node.js — `@ctroenv/node`

```typescript
import { nodeSource, loadEnv } from "@ctroenv/node"
import { defineEnv } from "@ctroenv/core"

// Just process.env
const env = defineEnv(schema, { source: nodeSource() })

// Load .env files with priority
const env = defineEnv(schema, { source: loadEnv() })
```

`loadEnv()` reads `.env` -> `.env.{NODE_ENV}` -> `.env.local`, each overriding the previous.

### Vite — `@ctroenv/vite`

Two integration points — a runtime source and a build plugin:

```typescript
// vite.config.ts
import { defineConfig } from "vite"
import { ctroenvPlugin } from "@ctroenv/vite"

export default defineConfig({
  plugins: [
    ctroenvPlugin({ schema: "./src/schema.ts", failOnError: true }),
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

With `failOnError: true`, `vite build` fails immediately if any variable is missing or invalid.

### Next.js — `@ctroenv/nextjs`

Next.js has a server/client split problem. Server code can access all env vars, but client code can only access `NEXT_PUBLIC_*` variables. CtroEnv handles this with a two-part schema:

```typescript
import { defineEnv } from "@ctroenv/nextjs"

export const env = defineEnv({
  server: {
    DATABASE_URL: string().url(),
    JWT_SECRET: string().secret().min(32),
  },
  client: {
    NEXT_PUBLIC_API_URL: string().url(),
    NEXT_PUBLIC_APP_NAME: string().default("My App"),
  },
})
```

On the server, both schemas validate. On the client, only `client` validates. Accessing a server-only key from client code throws:

```
Server-only environment variable "JWT_SECRET" is not accessible on the client.
Prefix it with NEXT_PUBLIC_ to expose it to the client bundle.
```

Catches the most common Next.js security mistake without requiring separate env files.

## The EnvSource Abstraction

Every adapter implements this interface:

```typescript
interface EnvSource {
  get(key: string): string | undefined
}
```

| Source | What it reads |
|--------|--------------|
| `detectSource()` (default) | `process.env` -> `import.meta.env` |
| `nodeSource()` | `process.env` |
| `loadEnv()` | `.env` files on disk |
| `viteSource()` | `import.meta.env` |
| Next.js `defineEnv()` | `process.env` |

Pass any object matching this interface to `defineEnv()`:

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

## What `defineEnv()` Returns

A deeply frozen object. Every property is read-only at runtime:

```typescript
const env = defineEnv({ PORT: number().port().default(3000) })
env.PORT = 4000 // TypeError in strict mode
```

Recursive freeze applies to nested objects inside validated values. Prevents accidental mutation of what should be immutable config.

## Full API Surface

| Export | Kind | Package |
|--------|------|---------|
| `defineEnv` | Function | `@ctroenv/core` |
| `string`, `number`, `boolean`, `pick` | Factories | `@ctroenv/core` |
| `createValidator`, `applyChain` | Factories | `@ctroenv/core` |
| `detectSource`, `objectSource` | Functions | `@ctroenv/core` |
| `url`, `email`, `port`, `min`, `max`, `regex`, `integer` | Refinements | `@ctroenv/core` |
| `CtroEnvError`, `ValidationError`, `formatErrors` | Errors | `@ctroenv/core` |
| `nodeSource`, `loadEnv` | Functions | `@ctroenv/node` |
| `viteSource`, `ctroenvPlugin` | Function + Plugin | `@ctroenv/vite` |
| `defineEnv`, `withCtroEnv` | Functions | `@ctroenv/nextjs` |

Up next: [Monorepo Environment Management at Scale](./monorepo-environment-management-at-scale) — sharing schemas across packages, extending base configs, running validation in CI.

*Resources:* [Docs](https://ctroenv.vercel.app) · [@ctroenv/core on npm](https://www.npmjs.com/package/@ctroenv/core) · [GitHub](https://github.com/ctrotech-tutor/ctroenv)
