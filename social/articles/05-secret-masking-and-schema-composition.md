---
title: Secrets at Rest, Schemas at Scale — What's New in CtroEnv v1.1.0
published: false
description: Two major features landed in CtroEnv v1.1.0 — runtime secret masking that prevents accidental leaks, and schema composition for monorepo-scale env management.
tags: typescript, nodejs, javascript, tutorial, devops
series: Mastering Environment Variables in TypeScript with CtroEnv
cover_image: https://ctroenv.vercel.app/og.png
---

Environment variables occupy a weird space in software. They're not exactly secrets, not exactly configuration — they're somewhere in between. And most tools treat them one way or the other: either you get full visibility (and risk `console.log` leaking a database password into your logs) or you get zero visibility (and debugging becomes guesswork).

CtroEnv v1.1.0 introduces two features that address this tension head-on.

## Runtime Secret Masking

The core insight: secrets should be invisible by default, accessible by intent.

```typescript
import { defineEnv, string } from "@ctroenv/core"

const env = defineEnv({
  DATABASE_URL: string().url(),
  JWT_SECRET: string().min(32).secret(),
})
```

When you mark a validator with `.secret()`, the returned env object wraps itself in a **Proxy**:

```typescript
console.log(env.JWT_SECRET)      // "********" — masked automatically
console.log(env.DATABASE_URL)    // "postgresql://..." — visible as usual

// Access the real value explicitly:
env.meta.get("JWT_SECRET")       // "supersecretkey..."
env.meta.keys()                  // ["JWT_SECRET"]
env.meta.has("JWT_SECRET")       // true
```

This means accidental leaks through `console.log`, error reports, or `JSON.stringify` simply don't happen:

```typescript
JSON.stringify(env)
// {"DATABASE_URL":"postgresql://...","JWT_SECRET":"********"}
```

The `.meta` object is non-enumerable — it won't appear in `Object.keys()`, `for...in`, or spread operators. You have to explicitly reach for it.

### Why a Proxy?

If you're thinking "why not just `Object.freeze`?" — good question. The ES Proxy spec prevents a `get` trap from returning different values than the target for non-configurable properties. Since we want `env.JWT_SECRET` to return `"********"` while the real value lives elsewhere, we use a Proxy with `set`/`deleteProperty` traps instead of freezing. The result behaves identically to a frozen object for all mutation attempts.

### Error Messages Are Safe Too

Secret values are automatically redacted in error output. If a validation fails, the raw value never appears:

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

The second major feature is aimed at teams managing multiple services from a single repository. Previously, each service had to duplicate common schema definitions. Now you can compose them:

```typescript
import { defineSchema, extendSchema, defineEnv, string, number } from "@ctroenv/core"

// Define shared variables once
const base = defineSchema({
  DATABASE_URL: string().url(),
  REDIS_URL: string().url().optional(),
  LOG_LEVEL: string().default("info"),
})

// API service extends shared
const apiSchema = extendSchema(base, {
  PORT: number().port().default(4000),
  API_KEY: string().secret(),
})

// Worker service extends shared
const workerSchema = extendSchema(base, {
  QUEUE_CONCURRENCY: number().positive().default(5),
  JOB_TIMEOUT: number().positive().default(30000),
})

const env = defineEnv(apiSchema)
env.DATABASE_URL // string — inherited
env.API_KEY      // "********" — secret + inherited
```

### Merge Semantics

Extension keys always override base keys. In development mode (`NODE_ENV=development`), conflicts are logged as warnings so you catch accidental overrides early.

The pattern composes naturally:

```typescript
// Chaining: base → staging → production
const stagingSchema = extendSchema(base, { /* staging overrides */ })
const prodSchema = extendSchema(stagingSchema, { /* prod overrides */ })
```

### Real-World Pattern: Monorepo Example

The official repo now ships a complete [monorepo example](https://github.com/ctrotech-tutor/ctroenv/tree/main/examples/monorepo) with three packages (`shared`, `api`, `worker`):

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

Each package loads env from the root `.env` using `loadEnv({ path: "../.." })`, keeping everything in sync without duplication.

## AGENTS.md — Universal AI Agent Guide

This one's for the tooling nerds. CtroEnv now ships an `AGENTS.md` at the repo root — a single file that every major AI coding tool reads automatically:

- **opencode** — reads `AGENTS.md` natively
- **Cursor** — reads `.cursorrules` and `AGENTS.md`
- **GitHub Copilot** — reads `AGENTS.md`
- **Claude Code** — reads `CLAUDE.md` and `AGENTS.md`
- **Cline / Roo** — reads `CLINE.md` and `AGENTS.md`

It covers the complete API: validators, chain order rules, secret masking, schema composition, error handling, CLI commands, custom validators, and anti-patterns. Any AI agent that lands on the repo instantly understands the library.

There's also a deep-dive skill file at `.opencode/skills/ctroenv/SKILL.md` with 3 worked examples and 2 reference documents.

## What Else Changed

| Package | Version | What |
|---------|---------|------|
| `@ctroenv/core` | 1.1.0 | Secret masking, schema composition, EnvMeta API |
| `@ctroenv/cli` | 1.1.0 | Config-level secrets masking (`secrets.mask` / `secrets.maskWith`) |
| `@ctroenv/node` | 1.0.2 | README + LICENSE polish |
| `@ctroenv/vite` | 1.0.2 | README + LICENSE polish |
| `@ctroenv/nextjs` | 1.0.2 | README + LICENSE polish |
| `@ctroenv/shared` | 1.0.2 | README + LICENSE polish |

## Migration from v1.0.x

**Zero breaking changes.** All existing schemas continue to work. The new `.secret()` method is additive. `defineSchema()` and `extendSchema()` are new exports that don't affect existing code.

To upgrade your packages:

```bash
npm install @ctroenv/core@^1.1.0 @ctroenv/cli@^1.1.0
```

## What's Next

The focus for v1.2.0 is ergonomics: a `zodToCtroEnv` bridge for teams migrating from Zod, environment-aware types (e.g., `Email` / `URL` branded types), and deeper Next.js integration with RSC context propagation.

Until then — keep your secrets secret and your schemas composable.

---

*CtroEnv is open source under MIT. Star it on [GitHub](https://github.com/ctrotech-tutor/ctroenv), read the [docs](https://ctroenv.vercel.app), or join the discussion in the issues.*
