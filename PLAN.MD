# CtroEnv — Full Build Plan

> **Define once. Trust everywhere.**
>
> A TypeScript-first environment management toolkit that helps developers define,
> validate, document, and manage environment variables across any JavaScript project.

## Overview

This document is the master index for the CtroEnv build plan. Each phase is a
standalone document under `plan/` with concrete deliverables, acceptance
criteria, and timelines.

---

## The Four Pillars

| Pillar | Description | Phases |
|---|---|---|
| **Define** | Declare variables once in a schema | Phase 1 |
| **Validate** | Fail-fast at startup with beautiful errors | Phase 1, 2 |
| **Document** | Auto-generate docs, examples, and references | Phase 2, 4 |
| **Manage** | CLI tooling, secret protection, env diffing | Phase 2, 5 |

---

## Phases at a Glance

| Phase | Name | Duration | Key Deliverable |
|---|---|---|---|
| **0** | Foundation & Project Setup | Week 1 | Monorepo, tooling, CI, GitHub config |
| **1** | Core Library — Schema Engine | Weeks 2-3 | `defineEnv`, validators, type inference |
| **2** | CLI Tooling | Weeks 4-5 | `validate`, `generate`, `check`, `docs` |
| **3** | Framework Adapters | Week 6 | Node, Vite, Next.js adapters |
| **4** | Polish & Developer Experience | Week 7 | Error refinement, docs site, benchmarks |
| **5** | Enterprise & Ecosystem | Week 8+ | Secret management, ESLint plugin, vault |

---

## Detailed Plans

| File | Covers |
|---|---|
| [Phase 0 — Foundation](plan/01-foundation.md) | Monorepo setup, TypeScript, tooling, CI, GitHub |
| [Phase 1 — Core Library](plan/02-core.md) | Schema engine, validators, type inference, tests |
| [Phase 2 — CLI Tooling](plan/03-cli.md) | CLI commands, config, terminal output |
| [Phase 3 — Framework Adapters](plan/04-adapters.md) | Node, Vite, Next.js adapters |
| [Phase 4 — Polish & DX](plan/05-polish.md) | Error messages, benchmarks |
| [Phase 5 — Enterprise & Ecosystem](plan/06-enterprise.md) | Secret management, plugins, long-term vision |
| [Phase 7 — Documentation Site](plan/07-docs.md) | Next.js docs site, content roadmap, deployment |

---

## Guiding Principles

1. **Zero-dependency core** — The `@ctroenv/core` package has no runtime dependencies.
2. **Standard Schema compliant** — Users can use our validators *or* Zod/Valibot/ArkType.
3. **CLI from day one** — Tooling is not an afterthought; it ships with v1.
4. **Runtime-agnostic** — Works in Node, Bun, Deno, Vite, Cloudflare Workers, browsers.
5. **Beautiful errors** — Every error message is a terminal-first experience with actionable suggestions.
6. **Monorepo-first** — Built for sharing schemas across packages from the start.
7. **TypeScript-native** — Full type inference with zero manual annotations.

---

## Package Architecture

```
@ctroenv/core        # Schema definition, validators, type inference
@ctroenv/cli         # CLI commands
@ctroenv/node        # process.env source adapter
@ctroenv/vite        # import.meta.env source adapter
@ctroenv/nextjs      # Next.js adapter with build-time validation
```

---

## Quick-Start Example (Target v1 API)

```ts
import { defineEnv, string, number, pick } from "@ctroenv/core"

const env = defineEnv({
  DATABASE_URL: string().url().describe("PostgreSQL connection URL"),
  PORT:         number().default(3000).min(1024).max(65535),
  NODE_ENV:     pick(["development", "production", "test"]).default("development"),
  JWT_SECRET:   string().secret(),
})

// Fully typed, no assertions needed
env.DATABASE_URL  // string
env.PORT          // number
env.NODE_ENV      // "development" | "production" | "test"
```

```bash
ctroenv validate    # Beautiful error output with suggestions
ctroenv generate    # Create/update .env.example from schema
ctroenv check       # Diff .env vs schema
ctroenv docs        # Generate ENVIRONMENT.md
```
