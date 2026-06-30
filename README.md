![CtroEnv](public/ctroenv.png)

<h1 align="center">CtroEnv</h1>

<p align="center">
  <strong>Define once. Trust everywhere.</strong>
  <br>
  TypeScript-first environment variable management toolkit.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ctroenv/core">
    <img src="https://img.shields.io/npm/v/@ctroenv/core?color=3b82f6&label=core" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/@ctroenv/core">
    <img src="https://img.shields.io/npm/dm/@ctroenv/core?color=3b82f6" alt="npm downloads">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-3b82f6" alt="license">
  </a>
  <a href="https://www.typescriptlang.org">
    <img src="https://img.shields.io/badge/TypeScript-6.0+-3178c6?logo=typescript&logoColor=white" alt="TypeScript">
  </a>
  <a href="https://biomejs.dev">
    <img src="https://img.shields.io/badge/code_style-Biome-60a5fa?logo=biome" alt="Biome">
  </a>
</p>

A TypeScript-first environment management toolkit. Define your environment schema once — get validation, type inference, CLI tooling, and auto-generated docs across any JavaScript project.

```ts
import { defineEnv, string, number, pick } from "@ctroenv/core"

const env = defineEnv({
  DATABASE_URL: string().url().describe("Primary database connection"),
  PORT: number().port().default(3000),
  NODE_ENV: pick(["development", "production", "test"]),
})

// Fully inferred types — zero manual annotations
console.log(env.PORT) // number — TypeScript knows this
```

## The Four Pillars

| Pillar | What it does |
|--------|-------------|
| **Define** | Declare variables once with a chainable, type-safe schema — `.url()`, `.email()`, `.hostname()`, `.port()`, `.regex()`, `.min()`, `.max()`, `.int()`, `.positive()`, `.secret()`, `.default()`, and more |
| **Validate** | Fail fast at startup with beautiful terminal errors grouped by category (missing vs invalid), with actionable fix suggestions |
| **Document** | Auto-generate `.env.example`, `ENVIRONMENT.md`, and reference docs from your schema — no more stale documentation |
| **Manage** | CLI commands for validation, generation, env diffing, CI checks, and scaffolding — plus built-in secret protection for sensitive values |

## Packages

| Package | Description | Size | Status |
|---------|-------------|------|--------|
| [`@ctroenv/core`](https://www.npmjs.com/package/@ctroenv/core) | Schema engine — define, validate, infer types | ~4 KB gzip | [Published](https://www.npmjs.com/package/@ctroenv/core) |
| [`@ctroenv/cli`](https://www.npmjs.com/package/@ctroenv/cli) | CLI — validate, generate, check, docs, init | ~17 KB gzip | [Published](https://www.npmjs.com/package/@ctroenv/cli) |
| [`@ctroenv/node`](https://www.npmjs.com/package/@ctroenv/node) | Node.js adapter — `process.env` + `.env` file loading | ~2 KB gzip | [Published](https://www.npmjs.com/package/@ctroenv/node) |
| [`@ctroenv/vite`](https://www.npmjs.com/package/@ctroenv/vite) | Vite adapter — `import.meta.env` + build plugin | ~2 KB gzip | [Published](https://www.npmjs.com/package/@ctroenv/vite) |
| [`@ctroenv/nextjs`](https://www.npmjs.com/package/@ctroenv/nextjs) | Next.js adapter — client/server split, build-time validation | ~3 KB gzip | [Published](https://www.npmjs.com/package/@ctroenv/nextjs) |
| [`@ctroenv/shared`](https://www.npmjs.com/package/@ctroenv/shared) | Internal shared utilities — logger, helpers | ~3 KB gzip | [Published](https://www.npmjs.com/package/@ctroenv/shared) |

> **Zero runtime dependencies** across all packages. The `@ctroenv/cli` package bundles `commander`, `dotenv`, `jiti`, `chokidar`, and `picocolors` for CLI operations — all other packages remain dependency-free.

### Reactive Validation

For long-running processes, use `watchEnv()` to re-validate when the source changes:

```ts
import { watchEnv, string, number } from "@ctroenv/core"

const env = watchEnv(
  { DATABASE_URL: string().url(), PORT: number().port().default(3000) },
  { pollInterval: 1000, onChange: (key, old, next) => console.log(`${key}: ${old} -> ${next}`) },
)
```

## Installation

```bash
npm install @ctroenv/core
# or
yarn add @ctroenv/core
# or
pnpm add @ctroenv/core
# or
bun add @ctroenv/core
```

## Quick Start

```ts
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

### Built-in Validators

| Validator | Type | Refinements |
|-----------|------|-------------|
| `string()` | `string` | `.url()`, `.email()`, `.port()`, `.hostname()`, `.min()`, `.max()`, `.regex()` |
| `number()` | `number` | `.int()`, `.positive()`, `.port()`, `.min()`, `.max()` |
| `boolean()` | `boolean` | Coerces `true`/`false`, `"true"`/`"false"`, `"yes"`/`"no"`, `"on"`/`"off"`, `1`/`0`, `"y"`/`"n"`, `"t"`/`"f"` |
| `pick([...])` | union literal | Enum validation from a string list |
| `semver()` | `string` | Strict semver (no ranges, no `v` prefix) |
| `ip()` / `ipv4()` / `ipv6()` | `string` | IP address validation |
| `uuid()` / `guid()` | `string` | UUID (RFC 9562) and permissive GUID |

### Chainable Methods

Every validator supports: `.optional()`, `.default(v)`, `.describe(text)`, `.secret()`, `.validate(fn)`

### Secret Masking

Sensitive values marked with `.secret()` are automatically masked in output:

```ts
const env = defineEnv({ JWT_SECRET: string().secret() })
env.JWT_SECRET           // "********"
env.meta.get("JWT_SECRET") // actual value
```

### Schema Composition

```ts
import { defineSchema, extendSchema } from "@ctroenv/core"

const base = defineSchema({
  DATABASE_URL: string().url(),
  PORT: number().port().default(3000),
})

const schema = extendSchema(base, {
  JWT_SECRET: string().secret(),
})
```

### Custom Validators

```ts
import { createValidator, applyChain, parseOk, singleError, errInvalid, errType } from "@ctroenv/core"

function semver() {
  const base = createValidator<string>(
    (input, ctx) => {
      if (typeof input !== "string")
        return singleError(errType(ctx.key, typeof input, "semver"))
      if (!/^\d+\.\d+\.\d+$/.test(input))
        return singleError(errInvalid(ctx.key, input, "not a valid semver"))
      return parseOk(input)
    },
    { typeLabel: "semver" },
  )
  return applyChain(base)
}
```

## CLI

```bash
# Install globally or use via npx
npm install -g @ctroenv/cli

# Validate your .env against the schema
ctroenv validate

# Watch mode — re-validate on file changes
ctroenv validate --watch

# Generate .env.example from schema
ctroenv generate

# CI-friendly env diffing (exit code 1 on mismatch)
ctroenv check --strict

# Auto-generate ENVIRONMENT.md
ctroenv docs

# Scaffold a new project
ctroenv init

# Generate schema stub from .env file
ctroenv init --from-env .env.local
```

## Framework Adapters

```ts
// Node.js — read from process.env + .env files
import { defineEnv } from "@ctroenv/core"
import { loadEnv } from "@ctroenv/node"

const env = defineEnv({ DATABASE_URL: string().url() }, {
  source: loadEnv(),
})

// Vite — read from import.meta.env at build time
import { defineEnv } from "@ctroenv/core"
import { viteSource } from "@ctroenv/vite"

const env = defineEnv({ API_URL: string().url() }, {
  source: viteSource(),
})

// Next.js — client/server split with build-time validation
import { defineEnv } from "@ctroenv/nextjs"

const env = defineEnv({
  server: { DATABASE_URL: string().url() },
  client: { NEXT_PUBLIC_API_URL: string().url() },
})
```

## Documentation

| Resource | Link |
|----------|------|
| Getting Started | [ctroenv.vercel.app/docs/getting-started](https://ctroenv.vercel.app/docs/getting-started) |
| Core API | [ctroenv.vercel.app/docs/core](https://ctroenv.vercel.app/docs/core) |
| CLI Guide | [ctroenv.vercel.app/docs/cli](https://ctroenv.vercel.app/docs/cli) |
| Node.js | [ctroenv.vercel.app/docs/node](https://ctroenv.vercel.app/docs/node) |
| Vite | [ctroenv.vercel.app/docs/vite](https://ctroenv.vercel.app/docs/vite) |
| Next.js | [ctroenv.vercel.app/docs/nextjs](https://ctroenv.vercel.app/docs/nextjs) |
| Migration Guides | [ctroenv.vercel.app/docs/migration](https://ctroenv.vercel.app/docs/migration) |

## Examples

Check the [`examples/`](./examples) directory for complete project setups:

- [Basic Node.js](./examples/basic-node/)
- [Express + CtroEnv](./examples/with-express/)
- [Vite + CtroEnv](./examples/with-vite/)
- [Next.js + CtroEnv](./examples/with-nextjs/)
- [CLI-driven project](./examples/with-cli/)
- [Monorepo setup](./examples/monorepo/)
- [GitHub Actions](./examples/github-actions/)

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
- **Vitest** for testing (v8 coverage, 90%+ thresholds)
- **tsup** for building

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
