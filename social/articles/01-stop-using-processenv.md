---
title: Stop Using process.env Directly — Here's Why
published: false
description: Why raw process.env is dangerous for production apps, and how schema-based validation prevents entire classes of bugs.
tags: typescript, nodejs, javascript, tutorial, devops
series: Mastering Environment Variables in TypeScript with CtroEnv
cover_image: https://ctroenv.vercel.app/og.png
---

Last month I pushed a new service to staging. Forgot to add `REDIS_URL` to the env file. The server started fine — no crash, no error — but the first request that tried to hit the cache hung forever. Took me 20 minutes and a `strace` to figure out the connection was silently failing.

I've done this enough times now to recognize the pattern: environment variables in Node.js are just `string | undefined`. TypeScript can't help you. Validation is your job. Most teams do it wrong, or don't do it at all.

## The Problem with `process.env`

```typescript
const dbUrl = process.env.DATABASE_URL
//    ^? string | undefined — TypeScript can't help you here
const port = process.env.PORT
//    ^? string | undefined — also a string, not a number
```

Three things go wrong here:

1. **No guarantee the variable exists.** It could be `undefined` at any time, and you won't know until runtime.
2. **No type information.** `PORT` is a number semantically, but it's a string at runtime. Every consumer has to parse it themselves.
3. **No documentation.** What format should `DATABASE_URL` be? What's the default for `PORT`? Who knows — go find the README, which is probably outdated.

## Three Common Failure Patterns

### 1. Missing Required Vars

```typescript
// src/db.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // undefined — oops
})
// Error: connect ECONNREFUSED — good luck debugging that
```

No error at import time. No error at server start. The error surfaces the first time someone hits a database endpoint.

### 2. Wrong Format, Cryptic Errors

```typescript
// .env
DATABASE_URL=localhost:5432/myapp  // forgot the postgres:// prefix

// src/db.ts
const url = new URL(process.env.DATABASE_URL) // TypeError: Invalid URL
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

Every `parseInt`, `Number()`, `=== "true"`, or `as string` is validation logic you're scattering across your codebase. Most teams don't even do that.

## The Manual Approach

I've written this function before:

```typescript
// src/env.ts
function getEnv(): Env {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is required")

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

  return { databaseUrl, port, nodeEnv, jwtSecret } as const
}

export const env = getEnv()
```

It works. But it's repetitive, scattered, undocumented, not CI-friendly, and TypeScript can't infer literal types from it.

## Schema-Based Validation

What if you could write this instead:

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
- **Validation at definition time** — if `DATABASE_URL` is missing or invalid, it throws immediately
- **Defaults** — `PORT` defaults to `3000` if not set
- **Secrets marked** — `JWT_SECRET` is flagged, won't leak into docs or logs
- **Descriptions** — each variable carries its docs alongside the schema

## How It Works

`defineEnv()` reads from your source (defaults to `process.env`), runs each value through its validator chain, and collects errors. If any exist, it throws `CtroEnvError` with every error grouped and formatted:

```
 ● Missing required (1)

   DATABASE_URL  Add this variable to your .env file or set it in the environment.

 ✗ Invalid (1)

   CORS_ORIGIN
   Invalid URL
```

No hunting through logs. You know exactly what's wrong and what to fix.

## Validators at a Glance

| Factory | Creates | Coercion |
|---------|---------|----------|
| `string()` | A string validator | None |
| `number()` | A number validator | Coerces `"3000"` -> `3000`, rejects `NaN` |
| `boolean()` | A boolean validator | Coerces `"true"`/`"1"` -> `true`, `"false"`/`"0"` -> `false` |
| `pick([...])` | A union of allowed string values | Fuzzy suggestion on typo |

String refinements: `.url()`, `.email()`, `.port()`, `.min(n)`, `.max(n)`, `.regex(p)`
Number refinements: `.int()`, `.positive()`, `.port()`, `.min(n)`, `.max(n)`
Chainable (all validators): `.default(v)`, `.optional()`, `.describe(t)`, `.secret()`, `.validate(fn)`

## Putting It Together

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
  res.json({ status: "ok", uptime: process.uptime(), nodeEnv: env.NODE_ENV, port: env.PORT })
})

app.listen(env.PORT, env.HOST, () => {
  console.log(`Server running on http://${env.HOST}:${env.PORT}`)
})
```

If any env var is missing or invalid, the app fails at import time — not the first time someone hits a route.

## Beyond Validation

Once your schema exists, the CLI tools layer on:

- `npx ctroenv generate` — creates `.env.example` from your schema
- `npx ctroenv validate` — fails CI if env drifts from schema
- `npx ctroenv docs` — generates `ENVIRONMENT.md`
- Secrets marked with `.secret()` are masked in output and commented out in `.env.example`

| Approach | Type safety | Error clarity | Auto-docs | CI support | Lines per var |
|----------|-------------|---------------|-----------|------------|---------------|
| Raw `process.env` | None | None | No | No | 1 |
| Manual validation | Partial | Depends | No | No | 5-10 |
| CtroEnv | Full | Grouped | Yes | Yes | 1 |

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

**Resources:** [Docs](https://ctroenv.vercel.app) · [GitHub](https://github.com/ctrotech-tutor/ctroenv) · [npm](https://www.npmjs.com/org/ctroenv)

*Next: [Define Once, Trust Everywhere — CtroEnv Deep Dive](./define-once-trust-everywhere-ctroenv-deep-dive)*
