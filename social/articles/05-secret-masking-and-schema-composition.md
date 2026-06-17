---
title: Secrets at Rest, Schemas at Scale — What's New in CtroEnv v1.1.0
description: Two major features landed in CtroEnv v1.1.0 — runtime secret masking that prevents accidental leaks, and schema composition for monorepo-scale env management.
tags: typescript, nodejs, javascript, tutorial, devops
series: Mastering Environment Variables in TypeScript with CtroEnv
---

I accidentally logged a JWT secret to the console while debugging a test. Twice. The first time I thought "eh, it's just dev." The second time I realized the problem wasn't me — it was that my env tool treated secrets and config the same way. No distinction. No protection. Just a flat bag of strings where a `console.log(env)` dumped everything.

That's the gap v1.1.0 tries to close.

## Runtime Secret Masking

The API is simple — add `.secret()` to any validator:

```typescript
import { defineEnv, string } from "@ctroenv/core"

const env = defineEnv({
  DATABASE_URL: string().url(),
  JWT_SECRET: string().min(32).secret(),
})
```

Now `env.JWT_SECRET` returns `"********"` instead of the real value:

```typescript
console.log(env.JWT_SECRET)      // "********"
console.log(env.DATABASE_URL)    // "postgresql://..." — visible as usual

// Real value when you need it:
env.meta.get("JWT_SECRET")       // "supersecretkey..."
env.meta.keys()                  // ["JWT_SECRET"]
env.meta.has("JWT_SECRET")       // true
```

This means `console.log(env)`, error reports, and `JSON.stringify` are safe by default:

```typescript
JSON.stringify(env)
// {"DATABASE_URL":"postgresql://...","JWT_SECRET":"********"}
```

`.meta` is non-enumerable — it won't show up in `Object.keys()`, `for...in`, or spreads. You have to reach for it explicitly.

### Why a Proxy?

`Object.freeze` can't intercept reads. The ES Proxy spec prevents a `get` trap from returning different values for non-configurable target properties. So instead of freezing, we use a Proxy with `set`/`deleteProperty` traps. The result feels identical — you can't mutate it, but reads on secret keys get masked.

### Error Messages Are Safe Too

Secret values are redacted in error output automatically:

```typescript
try {
  defineEnv({ KEY: string().secret() }, { source: { KEY: "exposed" } })
} catch (e) {
  if (e instanceof CtroEnvError) {
    console.log(e.errors[0].value) // "********" — not "exposed"
  }
}
```

## Schema Composition for Monorepos

The second feature comes from working on a monorepo ourselves. We had three packages (`shared`, `api`, `worker`) all needing `DATABASE_URL` and `JWT_SECRET`, but each needing their own specific vars too. Before, we copy-pasted. After, we composed:

```typescript
import { defineSchema, extendSchema, defineEnv, string, number } from "@ctroenv/core"

// Define shared vars once
const base = defineSchema({
  DATABASE_URL: string().url(),
  REDIS_URL: string().url().optional(),
  LOG_LEVEL: string().default("info"),
})

// API service extends
const apiSchema = extendSchema(base, {
  PORT: number().port().default(4000),
  API_KEY: string().secret(),
})

// Worker extends
const workerSchema = extendSchema(base, {
  QUEUE_CONCURRENCY: number().positive().default(5),
  JOB_TIMEOUT: number().positive().default(30000),
})

const env = defineEnv(apiSchema)
env.DATABASE_URL // string — inherited
env.API_KEY      // "********" — secret + inherited
```

### Merge Semantics

Extension keys override base keys. Dev mode (`NODE_ENV=development`) logs a warning on conflict so you don't accidentally shadow a shared var.

Chaining works naturally:

```typescript
const stagingSchema = extendSchema(base, { /* overrides */ })
const prodSchema = extendSchema(stagingSchema, { /* overrides */ })
```

### Real Example

We shipped a [monorepo example](https://github.com/ctrotech-tutor/ctroenv/tree/main/examples/monorepo) with the repo:

```
monorepo/
  .env                          # Root env file
  packages/
    shared/src/index.ts         # defineSchema({ DATABASE_URL, REDIS_URL, LOG_LEVEL })
    api/src/env.ts              # extendSchema(base, { PORT, API_KEY })
    api/src/index.ts            # defineEnv(apiSchema)
    worker/src/env.ts           # extendSchema(base, { QUEUE_CONCURRENCY, JOB_TIMEOUT })
    worker/src/index.ts         # defineEnv(workerSchema)
```

Each package loads env from root via `loadEnv({ path: "../.." })`. One `.env` file, three schemas.

## AGENTS.md

CtroEnv now ships an `AGENTS.md` at the repo root. It covers the API, chain order rules, error handling, CLI commands, and anti-patterns. Any AI agent that lands on the repo reads it automatically — opencode, Cursor, Copilot, Claude Code, Cline.

There's also a skill file at `.opencode/skills/ctroenv/SKILL.md` with worked examples.

## What Else Changed

| Package | Version | What |
|---------|---------|------|
| `@ctroenv/core` | 1.1.0 | Secret masking, schema composition, EnvMeta API |
| `@ctroenv/cli` | 1.1.0 | Config-level secrets masking |
| `@ctroenv/{node,vite,nextjs,shared}` | 1.0.2 | README + LICENSE polish |

No breaking changes. Existing schemas keep working.

```
npm install @ctroenv/core@^1.1.0 @ctroenv/cli@^1.1.0
```

The v1.2.0 roadmap: a `zodToCtroEnv` bridge, branded types (Email, URL), and deeper Next.js RSC integration.

Try `string().secret()` and see if it catches anything you'd rather keep quiet.
