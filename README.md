# CtroEnv

**Define once. Trust everywhere.**

[![npm version](https://img.shields.io/npm/v/@ctroenv/core?color=3b82f6&label=core)](https://www.npmjs.com/package/@ctroenv/core)
[![npm downloads](https://img.shields.io/npm/dm/@ctroenv/core?color=3b82f6)](https://www.npmjs.com/package/@ctroenv/core)
[![License](https://img.shields.io/badge/license-MIT-3b82f6)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Biome](https://img.shields.io/badge/code_style-Biome-60a5fa?logo=biome)](https://biomejs.dev)

A TypeScript-first environment management toolkit. Define your environment schema once — get validation, type inference, CLI tooling, and auto-generated docs across any JavaScript project.

```typescript
import { defineEnv, string, number, pick } from "@ctroenv/core"

const env = defineEnv({
  DATABASE_URL: string().url().describe("PostgreSQL connection URL"),
  PORT: number().port().default(3000),
  NODE_ENV: pick(["development", "production", "test"]),
})

// Fully inferred types — zero manual annotations
console.log(env.PORT) // number — TypeScript knows this
```

---

## The Four Pillars

| Pillar | What it does |
|--------|-------------|
| **Define** | Declare variables once with a chainable, type-safe schema — `.url()`, `.port()`, `.secret()`, `.min()`, `.max()`, `.default()` and more |
| **Validate** | Fail fast at startup with beautiful terminal errors grouped by category (missing vs invalid), with actionable fix suggestions |
| **Document** | Auto-generate `.env.example`, `ENVIRONMENT.md`, and reference docs from your schema — no more stale documentation |
| **Manage** | CLI commands for validation, generation, env diffing, and CI checks — plus built-in secret protection for sensitive values |

## Packages

| Package | Description | Size (gzip) | Status |
|---------|-------------|-------------|--------|
| [`@ctroenv/core`](https://www.npmjs.com/package/@ctroenv/core) | Schema engine — define, validate, infer types | ~4 KB | [Published](https://www.npmjs.com/package/@ctroenv/core) |
| [`@ctroenv/cli`](https://www.npmjs.com/package/@ctroenv/cli) | CLI — validate, generate, check, docs | ~15 KB | [Published](https://www.npmjs.com/package/@ctroenv/cli) |
| [`@ctroenv/node`](https://www.npmjs.com/package/@ctroenv/node) | Node.js adapter — `process.env` source | ~2 KB | [Published](https://www.npmjs.com/package/@ctroenv/node) |
| [`@ctroenv/vite`](https://www.npmjs.com/package/@ctroenv/vite) | Vite adapter — `import.meta.env` + build plugin | ~2 KB | [Published](https://www.npmjs.com/package/@ctroenv/vite) |
| [`@ctroenv/nextjs`](https://www.npmjs.com/package/@ctroenv/nextjs) | Next.js adapter — client/server split, build-time validation | ~3 KB | [Published](https://www.npmjs.com/package/@ctroenv/nextjs) |
| [`@ctroenv/shared`](https://www.npmjs.com/package/@ctroenv/shared) | Shared utilities — logger, type helpers | ~3 KB | [Published](https://www.npmjs.com/package/@ctroenv/shared) |

All packages have **zero runtime dependencies** except `@ctroenv/cli` (commander, dotenv, picocolors).

## Quick Start

```bash
npm install @ctroenv/core
# or
yarn add @ctroenv/core
# or
pnpm add @ctroenv/core
# or
bun add @ctroenv/core
```

```typescript
import { defineEnv, string, number, pick } from "@ctroenv/core"

const env = defineEnv({
  // Required with validation
  DATABASE_URL: string().url().describe("PostgreSQL connection URL"),

  // Optional with default
  PORT: number().port().default(3000),

  // Enum-style validation
  NODE_ENV: pick(["development", "production", "test"]).default("development"),

  // Sensitive values — protected from accidental exposure
  JWT_SECRET: string().secret().min(32),
})

// TypeScript infers all types automatically
env.DATABASE_URL  // string
env.PORT          // number
env.NODE_ENV      // "development" | "production" | "test"
```

### With the CLI

```bash
# Install globally or use via npx
npm install -g @ctroenv/cli

# Validate your .env against the schema
ctroenv validate

# Generate .env.example from schema
ctroenv generate

# CI-friendly env diffing
ctroenv check

# Auto-generate ENVIRONMENT.md
ctroenv docs
```

## Framework Adapters

```typescript
// Node.js — reads from process.env
import { fromNode } from "@ctroenv/node"
const env = fromNode(schema)

// Vite — reads from import.meta.env
import { fromVite } from "@ctroenv/vite"
const env = fromVite(schema)

// Next.js — build-time validation + runtime access
import { fromNext } from "@ctroenv/nextjs"
const env = fromNext(schema)
```

## Documentation

| Resource | Link |
|----------|------|
| Getting Started | [ctroenv.vercel.app/docs/getting-started](https://ctroenv.vercel.app/docs/getting-started) |
| Core API | [ctroenv.vercel.app/docs/core](https://ctroenv.vercel.app/docs/core) |
| CLI Guide | [ctroenv.vercel.app/docs/cli](https://ctroenv.vercel.app/docs/cli) |
| Framework Guides | [ctroenv.vercel.app/docs/node](https://ctroenv.vercel.app/docs/node) |
| Migration Guides | [ctroenv.vercel.app/docs/migration](https://ctroenv.vercel.app/docs/migration) |

## Examples

Check the [`examples/`](./examples) directory for complete project setups:

- [Basic Node.js](./examples/basic-node/)
- [Express + CtroEnv](./examples/with-express/)
- [Vite + CtroEnv](./examples/with-vite/)
- [Next.js + CtroEnv](./examples/with-nextjs/)
- [CLI-driven project](./examples/with-cli/)
- [Monorepo setup](./examples/monorepo/)

## Comparison

| Feature | CtroEnv | Zod + manual | envalid | t3-env |
|---------|---------|-------------|---------|--------|
| Zero-dep core | ✅ | ❌ (Zod ~50 KB) | ❌ (6 deps) | ❌ (Zod + t3) |
| Full type inference | ✅ | ✅ | Partial | ✅ |
| Built-in CLI | ✅ | ❌ | ❌ | ❌ |
| Beautiful errors | ✅ | ❌ | Basic | Basic |
| Framework adapters | Node, Vite, Next.js | Manual | Node only | Next.js only |
| Auto-docs | ✅ | ❌ | ❌ | ❌ |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

This project uses:

- **npm workspaces** for the monorepo
- **Biome** for linting and formatting
- **Vitest** for testing
- **tsup** for building
- **Changesets** for versioning and changelogs

```bash
git clone https://github.com/ctrotech-tutor/ctroenv.git
cd ctroenv
npm install
npm run build
npm test
```

## Security

See [SECURITY.md](SECURITY.md) for our security policy and responsible disclosure process.

## License

MIT © [Ctrotech](https://github.com/ctrotech-tutor)

---

<p align="center">
  <a href="https://ctroenv.vercel.app">Documentation</a> •
  <a href="https://github.com/ctrotech-tutor/ctroenv">GitHub</a> •
  <a href="https://www.npmjs.com/org/ctroenv">npm</a>
</p>
