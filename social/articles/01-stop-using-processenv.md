---
title: Stop Using process.env Directly — Here's Why
published: false
description: Why raw process.env is dangerous for production apps, and how schema-based validation prevents entire classes of bugs.
tags: typescript, nodejs, javascript, tutorial, devops
series: Mastering Environment Variables in TypeScript with CtroEnv
cover_image: https://ctroenv.vercel.app/og.png
---

It's 2:47 AM. Your phone lights up. PagerDuty: "Production API is returning 502s." You open your laptop, ssh into the box, check the logs:

```
TypeError: process.env.REDIS_URL is undefined
    at connectRedis (src/lib/redis.ts:12)
```

You check `.env.production`. Sure enough — someone added `REDIS_URL` to the infrastructure ticket but forgot to deploy the updated env file. The server started fine (no startup validation), but crashed the first time something tried to connect to Redis. Forty-seven minutes of downtime. For a missing string.

If this story sounds familiar, keep reading. If it doesn't — it will.

## The Problem with `process.env`

Environment variables in Node.js are just `string | undefined`:

```typescript
const dbUrl = process.env.DATABASE_URL
//    ^? string | undefined — TypeScript can't help you here
const port = process.env.PORT
//    ^? string | undefined — also a string, not a number
```

Three things are wrong with this picture:

1. **No guarantee the variable exists.** It could be `undefined` at any time, and you won't know until runtime.
2. **No type information.** `PORT` is a number semantically, but it's a string at runtime. Every consumer has to parse it themselves.
3. **No documentation.** What format should `DATABASE_URL` be? What's the default for `PORT`? Who knows — go read the README, which is probably outdated.

## Three Failure Patterns I See Everywhere

### 1. Missing Required Vars

The most common and most damaging:

```typescript
// src/db.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // undefined — oops
})
// Error: connect ECONNREFUSED — good luck debugging that
```

No error at import time. No error at server start. The error surfaces the first time someone hits a database endpoint. In production. At 2 AM.

### 2. Wrong Format, Cryptic Errors

```typescript
// .env
DATABASE_URL=localhost:5432/myapp  // forgot the postgres:// prefix

// src/db.ts
const url = new URL(process.env.DATABASE_URL) // 🔥 TypeError: Invalid URL
```

Or worse — silent data corruption:

```typescript
// .env
MAX_CONNECTIONS=not-a-number

// src/config.ts
const max = parseInt(process.env.MAX_CONNECTIONS ?? "10", 10)
//    ^? NaN — your connection pool silently uses NaN as max
```

### 3. Type Confusion

```typescript
// .env
PORT=3000

// src/server.ts
const port = process.env.PORT // "3000" — it's a string!
app.listen(port + 1)          // listens on "30001", not 3001
```

Every time you write `parseInt`, `Number()`, `=== "true"`, or `as string`, you're writing validation logic that should be centralized. And let's be honest — most teams don't even do that.

## The Manual Approach (Why It Doesn't Scale)

I've seen teams write this:

```typescript
// src/env.ts
function getEnv(): Env {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is required")
  // But is it a valid URL? Who knows!

  const port = parseInt(process.env.PORT ?? "3000", 10)
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be between 1 and 65535")
  }

  const nodeEnv = process.env.NODE_ENV ?? "development"
  if (!["development", "production", "test"].includes(nodeEnv)) {
    throw new Error(`Invalid NODE_ENV: ${nodeEnv}`)
  }

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) throw new Error("JWT_SECRET is required")
  if (jwtSecret.length < 32) throw new Error("JWT_SECRET must be at least 32 chars")

  return {
    databaseUrl, // inferred as string
    port,        // inferred as number
    nodeEnv,     // inferred as string, not "development" | "production" | "test"
    jwtSecret,
  } as const
}

export const env = getEnv()
```

This works. But:

- **It's repetitive.** Every env var needs the same pattern: check existence, validate format, assign type.
- **It's scattered.** When you add `REDIS_URL`, you add another 5-10 lines. When you remove `JWT_SECRET`, you have to find and delete the block.
- **It's not documented.** None of this generates `.env.example` or `ENVIRONMENT.md` for you.
- **It's not CI-friendly.** There's no way to run this validation in CI without starting the app.
- **TypeScript can't infer literal types.** `nodeEnv` is `string`, not `"development" | "production" | "test"`.

## A Better Way: Schema-Based Validation

What if you could write this instead?

```typescript
import { defineEnv, string, number, pick } from "@ctroenv/core"

const env = defineEnv({
  DATABASE_URL: string().url().describe("PostgreSQL connection URL"),
  PORT: number().port().default(3000),
  NODE_ENV: pick(["development", "production", "test"] as const).default("development"),
  JWT_SECRET: string().secret().min(32).describe("JWT signing secret"),
})
```

And get all of this automatically:

- **TypeScript infers everything** — `env.PORT` is `number`, `env.NODE_ENV` is `"development" | "production" | "test"`
- **Validation at definition time** — if `DATABASE_URL` is missing or invalid, it throws immediately with a clear error
- **Defaults** — `PORT` defaults to `3000` if not set
- **Secrets marked** — `JWT_SECRET` is flagged as secret, so it won't leak into documentation or logs
- **Descriptions** — each variable carries its documentation alongside the schema

That's the core idea of CtroEnv: define your environment contract once, and get validation, type inference, CLI tooling, and documentation for free.

## How It Works

The `defineEnv()` function:

1. Reads from `process.env` (or any source you provide)
2. For each key in your schema, checks if the var is present
3. If missing and required → collects an error
4. If present → runs it through the validator chain (`.url()`, `.port()`, `.min()`, etc.)
5. If validation fails → collects an error with a clear message and suggestion
6. If any errors exist → throws `CtroEnvError` with all errors grouped and formatted

```typescript
import { defineEnv, string, number, boolean, pick } from "@ctroenv/core"

const env = defineEnv({
  // Required string, validated as URL
  DATABASE_URL: string().url().describe("PostgreSQL connection URL"),

  // Optional number with default
  PORT: number().port().default(3000),

  // Enum with auto-suggest (typo "produciton" → "Did you mean 'production'?")
  NODE_ENV: pick(["development", "production", "test"] as const).default("development"),

  // Sensitive value — 32 character minimum
  JWT_SECRET: string().secret().min(32),

  // Boolean from string "true"/"false"/"1"/"0"
  FEATURE_FLAG: boolean().default(false),

  // Optional URL — won't error if missing
  SENTRY_DSN: string().url().optional(),
})
```

The return type is fully inferred:

```typescript
env.DATABASE_URL  // string
env.PORT          // number
env.NODE_ENV      // "development" | "production" | "test"
env.FEATURE_FLAG  // boolean
env.SENTRY_DSN    // string | undefined  (because .optional())
```

No type assertions. No `as string`. No manual parsing.

## What Happens When Validation Fails

Instead of a cryptic stack trace, you get this:

```
 ● Missing required (1)

   DATABASE_URL  Add this variable to your .env file or set it in the environment.

 ✗ Invalid (1)

   CORS_ORIGIN
   Invalid URL

 → Define once. Trust everywhere.
```

Grouped by category (missing vs invalid), with the key name highlighted and actionable suggestions. No hunting through logs. You know exactly what's wrong and what to fix.

## The Validators at a Glance

CtroEnv comes with four factory functions and seven chainable refinements:

**Factory functions:**

| Factory | Creates | Coercion |
|---------|---------|----------|
| `string()` | A string validator | No coercion needed |
| `number()` | A number validator | Coerces `"3000"` → `3000`, rejects `NaN` |
| `boolean()` | A boolean validator | Coerces `"true"`/`"1"` → `true`, `"false"`/`"0"` → `false` |
| `pick([...])` | A union of allowed string values | Case-insensitive fuzzy suggestion on typo |

**Refinements for strings:**

| Method | What it checks |
|--------|---------------|
| `.url()` | Valid URL via `new URL()` |
| `.email()` | Matches `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| `.port()` | Integer between 1–65535 |
| `.min(n)` | At least `n` characters |
| `.max(n)` | At most `n` characters |
| `.regex(p)` | Matches custom RegExp pattern |

**Refinements for numbers:**

| Method | What it checks |
|--------|---------------|
| `.int()` | Integer (no decimals) |
| `.positive()` | Greater than zero |
| `.port()` | Integer between 1–65535 |
| `.min(n)` | At least `n` |
| `.max(n)` | At most `n` |

**Chainable methods on every validator:**

| Method | Effect |
|--------|--------|
| `.default(v)` | Fallback value when not set |
| `.optional()` | Allows `undefined` |
| `.describe(t)` | Description for docs and error messages |
| `.secret()` | Flags as sensitive — masked in output |
| `.validate(fn)` | Custom inline validation function |

## Putting It All Together

Here's what a real Express app looks like with CtroEnv:

```typescript
// src/env.ts
import { defineEnv, string, number, pick } from "@ctroenv/core"
import { loadEnv } from "@ctroenv/node"

const env = defineEnv({
  PORT: number().port().default(3000),
  HOST: string().default("0.0.0.0"),
  DATABASE_URL: string().url().describe("PostgreSQL connection URL"),
  JWT_SECRET: string().secret().min(32).describe("JWT signing secret"),
  CORS_ORIGIN: string().url().describe("Allowed CORS origin"),
  NODE_ENV: pick(["development", "production", "test"] as const).default("development"),
  LOG_LEVEL: pick(["debug", "info", "warn", "error"] as const).default("info"),
  REDIS_URL: string().url().optional().describe("Redis connection URL"),
}, { source: loadEnv() })

export { env }
```

```typescript
// src/index.ts
import express from "express"
import { env } from "./env"

const app = express()

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
  })
})

app.listen(env.PORT, env.HOST, () => {
  console.log(`Server running on http://${env.HOST}:${env.PORT}`)
})
```

If any environment variable is missing or invalid, the app fails at import time — not the first time someone hits a route. The error message tells you exactly what's wrong and how to fix it.

## Beyond Validation

Once your schema exists, several things become possible:

- **Auto-generated `.env.example`** — `npx ctroenv generate` reads your schema and creates a complete `.env.example` file with descriptions, types, and defaults
- **CI checks** — `npx ctroenv validate` fails your CI pipeline if the deployed env drifts from the schema
- **Auto-documentation** — `npx ctroenv docs` generates a complete `ENVIRONMENT.md` reference
- **Secrets protection** — Variables marked with `.secret()` are automatically masked in output and commented out in `.env.example`

## Comparison

| Approach | Type safety | Error clarity | Auto-docs | CI support | Lines per var |
|----------|-------------|---------------|-----------|------------|---------------|
| Raw `process.env` | None | None | No | No | 1 |
| Manual validation | Partial | Depends | No | No | 5–10 |
| CtroEnv | Full | Grouped + colored | Yes | Yes | 1 |

## Try It

```bash
npm install @ctroenv/core
```

```typescript
import { defineEnv, string, number } from "@ctroenv/core"

const env = defineEnv({
  DATABASE_URL: string().url(),
  PORT: number().port().default(3000),
})
```

**Resources:**
- 📖 [Documentation](https://ctroenv.vercel.app)
- ⭐ [GitHub](https://github.com/ctrotech-tutor/ctroenv)
- 📦 [npm](https://www.npmjs.com/org/ctroenv)

---

*This is part 1 of a 4-part series on managing environment variables in TypeScript with CtroEnv.*

*Next: [Define Once, Trust Everywhere — CtroEnv Deep Dive](./define-once-trust-everywhere-ctroenv-deep-dive) — a complete walkthrough of every validator, framework adapter, and the error system.*
