---
title: Monorepo Environment Management at Scale
published: false
description: How to compose environment schemas across workspace packages, validate in CI, and auto-generate documentation — all with CtroEnv.
tags: typescript, nodejs, monorepo, devops, tutorial
series: Mastering Environment Variables in TypeScript with CtroEnv
cover_image: https://ctroenv.vercel.app/og.png
---

Monorepos solve a lot of problems — shared code, atomic commits, unified tooling. But they introduce a unique challenge for environment variables: different services need different variables, yet they all share the same infrastructure.

Your API service needs `PORT` and `CORS_ORIGIN`. Your background worker needs `QUEUE_CONCURRENCY` and `WORKER_TIMEOUT`. But both need `DATABASE_URL`, `REDIS_URL`, and `JWT_SECRET`. How do you manage this without duplicating schemas and documentation?

---

## The Naive Approach (And Why It Breaks)

Without a sharing strategy, teams end up with copy-pasted schemas:

```typescript
// packages/api/src/env.ts — 43 lines, hand-written
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required")
if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required")
if (!process.env.REDIS_URL) throw new Error("REDIS_URL is required")
const PORT = parseInt(process.env.PORT ?? "3000")
// ... and so on
```

```typescript
// packages/worker/src/env.ts — 40 lines, almost the same
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required")
if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required")
if (!process.env.REDIS_URL) throw new Error("REDIS_URL is required")
const QUEUE_CONCURRENCY = parseInt(process.env.QUEUE_CONCURRENCY ?? "5")
// ... almost identical
```

Now someone changes `DATABASE_URL` to require a `.url()` format. They have to find every copy and update it. They miss one. The worker validates the old way, accepts an invalid URL, and crashes at 2 AM.

With CtroEnv, you define the shared contract once and compose it per-service.

---

## The Pattern: Schema Composition via Spread

### 1. Create a Shared Schema Package

```typescript
// packages/shared/src/index.ts
import { string, pick } from "@ctroenv/core"

export const base = {
  NODE_ENV: pick(["development", "staging", "production"] as const).default("development"),
  DATABASE_URL: string().url().secret().describe("PostgreSQL connection URL"),
  JWT_SECRET: string().secret().min(32).describe("JWT signing secret"),
  REDIS_URL: string().url().secret().optional().describe("Redis connection URL"),
}
```

This package (`@example/shared-config`) is published as an npm workspace member. It exports plain validator definitions — no `defineEnv()` call, no source binding, no side effects. Pure schema.

### 2. Extend in Each Service

```typescript
// packages/api/src/env.ts
import { defineEnv, string, number } from "@ctroenv/core"
import { loadEnv } from "@ctroenv/node"
import { base } from "@example/shared-config"

export const schema = {
  ...base,                      // DATABASE_URL, JWT_SECRET, REDIS_URL, NODE_ENV
  PORT: number().port().default(3000),
  HOST: string().default("0.0.0.0"),
  CORS_ORIGIN: string().url().describe("Allowed CORS origin"),
  API_VERSION: string().regex(/^\d+\.\d+$/).describe("API version"),
}

export const env = defineEnv(schema, { source: loadEnv() })
```

```typescript
// packages/worker/src/env.ts
import { defineEnv, string, number } from "@ctroenv/core"
import { loadEnv } from "@ctroenv/node"
import { base } from "@example/shared-config"

export const schema = {
  ...base,                      // DATABASE_URL, JWT_SECRET, REDIS_URL, NODE_ENV
  QUEUE_CONCURRENCY: number().int().min(1).default(5),
  WORKER_TIMEOUT: number().int().min(1000).default(30000),
  WORKER_LOG_LEVEL: string().default("info"),
}

export const env = defineEnv(schema, { source: loadEnv() })
```

### 3. Validate Independently

Each service validates its own schema against its own source. The shared vars inherit their validators from the base (`string().url().secret()` on `DATABASE_URL`), so they're consistent across every consumer.

If someone later tightens `DATABASE_URL` to require `.min(10)` in the shared package, both services pick it up automatically. No hunting for copies. No drift.

---

## Running Validation in CI

The `@ctroenv/cli` package provides four commands that are purpose-built for CI pipelines.

### `ctroenv validate` — Fail on Invalid Values

```yaml
# .github/workflows/ci.yml
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build -w packages/shared
      - run: npx ctroenv validate --source .env
        working-directory: packages/api
```

If any required variable is missing or any value fails validation, the pipeline fails with the full error report.

### `ctroenv check` — Detect Drift

```yaml
      - run: npx ctroenv check
        working-directory: packages/api
```

This compares the keys in `.env` against the schema. It reports:
- **Missing from env** — vars in the schema but not in `.env`
- **Unused in env** — vars in `.env` but not in the schema (typos, leftover variables)

This is useful for catching drift — when someone adds a new env var to the schema but forgets to update `.env.example`.

### `ctroenv generate` — Keep `.env.example` in Sync

```bash
npx ctroenv generate
```

Produces a complete `.env.example` from the schema:

```
# DATABASE_URL (required)
# PostgreSQL connection URL
# DATABASE_URL=

# PORT (optional, default: 3000)
PORT=3000

# JWT_SECRET (required)
# JWT_SECRET=
```

Secret variables are commented out. Variables with defaults are filled in. Every variable has its description and type as comment annotations.

Commit the generated `.env.example` to your repo. It stays in sync because it's derived from the same source of truth.

### `ctroenv docs` — Auto-Generate Documentation

```bash
npx ctroenv docs
```

Produces `ENVIRONMENT.md`:

```markdown
# Environment Variables Reference

## DATABASE_URL
- **Type:** `string`
- **Required:** Yes
- **Description:** PostgreSQL connection URL

## PORT
- **Type:** `number`
- **Required:** Yes
- **Default:** `3000`
```

JSON output is also available (`--format json`) for custom tooling or ingestion by developer portals.

---

## Putting It Together: A Monorepo CI Workflow

```yaml
name: Validate Environment

on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: [api, worker]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build -w packages/shared

      - name: Validate env vars
        run: npx ctroenv validate --source .env
        working-directory: packages/${{ matrix.package }}

      - name: Check env file consistency
        run: npx ctroenv check
        working-directory: packages/${{ matrix.package }}

      - name: Verify .env.example is up to date
        run: |
          npx ctroenv generate && git diff --exit-code .env.example
        working-directory: packages/${{ matrix.package }}
```

The last step is particularly powerful: `ctroenv generate` regenerates `.env.example`, then `git diff --exit-code` checks if it changed. If it did, the PR author forgot to commit the updated example. The pipeline fails with a clear signal.

---

## The Config File

All CLI behavior can be configured with a `ctroenv.config.ts` file:

```typescript
// packages/api/ctroenv.config.ts
import { defineConfig } from "@ctroenv/cli"

export default defineConfig({
  schema: "./src/env.ts",
  sources: {
    default: ".env",
  },
  output: {
    example: ".env.example",
    docs: "ENVIRONMENT.md",
  },
  secrets: {
    mask: ["JWT_SECRET", "DATABASE_URL"],
    maskWith: "••••••••",
  },
})
```

With this in place, `npx ctroenv validate` (without flags) reads the config, discovers the schema, and applies the settings automatically. Config files use the `ctroenv.config.ts` naming convention and are loaded at runtime via `jiti`.

---

## Why This Matters for Teams

The monorepo pattern with CtroEnv gives you three properties that are hard to achieve with manual env management:

1. **Single source of truth for shared vars.** Change `DATABASE_URL` validation in one place. Every service gets the update.
2. **Per-service autonomy.** The API can add `CORS_ORIGIN` without the worker knowing or caring. Each schema is independently valid.
3. **Documentation that stays fresh.** The same schema that validates at startup also generates `.env.example` and `ENVIRONMENT.md`. No stale READMEs.

---

## Coming Next

In the final article, [Building Your Own CtroEnv Validators](./building-your-own-ctroenv-validators), we'll look at the `createValidator()` and `applyChain()` APIs — how CtroEnv validators work internally, and how you can build and publish custom validators for domain-specific needs like semver strings, IP addresses, and AWS ARNs.

---

*Resources:*
- 📖 [Documentation](https://ctroenv.vercel.app)
- ⭐ [GitHub](https://github.com/ctrotech-tutor/ctroenv)
- 📦 [npm](https://www.npmjs.com/org/ctroenv)
- 🔧 [CLI reference](https://ctroenv.vercel.app/docs/cli)
