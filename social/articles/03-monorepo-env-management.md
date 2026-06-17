---
title: Monorepo Environment Management at Scale
published: false
description: How to compose environment schemas across workspace packages, validate in CI, and auto-generate documentation — all with CtroEnv.
tags: typescript, nodejs, monorepo, devops, tutorial
series: Mastering Environment Variables in TypeScript with CtroEnv
cover_image: https://ctroenv.vercel.app/og.png
---

We run a monorepo with three packages — `shared`, `api`, and `worker`. The API needs `PORT` and `CORS_ORIGIN`. The worker needs `QUEUE_CONCURRENCY` and `JOB_TIMEOUT`. Both need `DATABASE_URL`, `REDIS_URL`, and `JWT_SECRET`.

Before CtroEnv v1.1.0, we duplicated schemas. Every package had its own `if (!process.env.DATABASE_URL)` block, and every time we changed validation rules we had to hunt down every copy.

## The Pattern: Define Once, Extend Per-Service

### 1. Shared Schema Package

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

No `defineEnv()` call, no source binding, no side effects. Pure schema.

### 2. Extend in Each Service

```typescript
// packages/api/src/env.ts
import { defineEnv, string, number } from "@ctroenv/core"
import { loadEnv } from "@ctroenv/node"
import { base } from "@example/shared-config"

export const schema = {
  ...base,
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
  ...base,
  QUEUE_CONCURRENCY: number().int().min(1).default(5),
  WORKER_TIMEOUT: number().int().min(1000).default(30000),
  WORKER_LOG_LEVEL: string().default("info"),
}

export const env = defineEnv(schema, { source: loadEnv() })
```

Each service validates its own schema against its own source. The shared vars inherit their validators from `base`. Tighten `DATABASE_URL` in one place — both services pick it up.

This is also available via `defineSchema()` and `extendSchema()` if you prefer a more explicit API:

```typescript
import { defineSchema, extendSchema } from "@ctroenv/core"

const base = defineSchema({
  DATABASE_URL: string().url(),
})

const apiSchema = extendSchema(base, {
  PORT: number().port().default(4000),
})
```

`extendSchema` merges with spread semantics — extension keys override base. Dev mode warns on conflicts.

## Running Validation in CI

The CLI has four commands for CI pipelines.

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

### `ctroenv check` — Detect Drift

```yaml
      - run: npx ctroenv check
        working-directory: packages/api
```

Reports vars in the schema but not in `.env`, and vars in `.env` but not in the schema (typos, leftovers).

### `ctroenv generate` — Keep `.env.example` in Sync

```bash
npx ctroenv generate
```

Produces:

```
# DATABASE_URL (required)
# PostgreSQL connection URL
# DATABASE_URL=

# PORT (optional, default: 3000)
PORT=3000
```

Secret variables are commented out. Variables with defaults are filled in. Commit the generated file — it stays in sync because it's derived from the same schema.

### `ctroenv docs` — Auto-Generate Documentation

```bash
npx ctroenv docs
```

Produces `ENVIRONMENT.md` with type, required status, default, and description for every variable. JSON output (`--format json`) also available for custom tooling.

## Putting It Together

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

The last step is the most useful: regenerate `.env.example` and fail if it differs from what's committed. If the PR author forgot to commit the updated example, the pipeline catches it.

## The Config File

```typescript
// ctroenv.config.ts
import { defineConfig } from "@ctroenv/cli"

export default defineConfig({
  schema: "./src/env.ts",
  sources: { default: ".env" },
  output: { example: ".env.example", docs: "ENVIRONMENT.md" },
  secrets: { mask: ["JWT_SECRET", "DATABASE_URL"], maskWith: "****" },
})
```

With this in place, `npx ctroenv validate` (no flags) reads the config, discovers the schema, and applies settings automatically.

## What You Get

- Single source of truth for shared vars. Change `DATABASE_URL` validation in one place, every service gets the update.
- Per-service autonomy. The API can add `CORS_ORIGIN` without the worker knowing.
- Docs that stay fresh. The schema that validates at startup also generates `.env.example` and `ENVIRONMENT.md`.

Final article: [Building Your Own CtroEnv Validators](./building-your-own-ctroenv-validators) — how `createValidator()` and `applyChain()` work, and how to build custom validators for semver strings, IP addresses, and AWS ARNs.

*Resources:* [Docs](https://ctroenv.vercel.app) · [GitHub](https://github.com/ctrotech-tutor/ctroenv) · [CLI reference](https://ctroenv.vercel.app/docs/cli)
