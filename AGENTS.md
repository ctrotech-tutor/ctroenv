# CtroEnv — AI Agent Guide

TypeScript-first environment variable management. Zero-dependency core. Framework adapters for Node, Vite, and Next.js.

## Quick Facts

- **Packages:** `@ctroenv/core` (zero deps, 4 KB gz), `@ctroenv/cli`, `@ctroenv/node`, `@ctroenv/vite`, `@ctroenv/nextjs`, `@ctroenv/shared`
- **Entry:** Import validators from `@ctroenv/core`, wrap with `defineEnv()` to get a typed frozen env object
- **Language:** TypeScript strict, ESM only (`"type": "module"`)
- **Repo:** `ctrotech-tutor/ctroenv` — monorepo with npm workspaces

## Core API

### Validators

| Factory | Refinements | Type |
|---------|-------------|------|
| `string()` | `.url()`, `.email()`, `.port()`, `.hostname()`, `.min(n)`, `.max(n)`, `.regex(p)` | `Validator<string>` |
| `number()` | `.int()`, `.port()`, `.positive()`, `.min(n)`, `.max(n)` | `Validator<number>` |
| `boolean()` | accepts `true`/`false`, `"true"`/`"false"`, `"yes"`/`"no"`, `"on"`/`"off"`, `1`/`0` | `Validator<boolean>` |
| `pick(["a","b"])` | — | `Validator<"a" \| "b">` |
| `semver()` | — | `Validator<string>` |
| `ip()` | `.v4()`, `.v6()` | `Validator<string>` |
| `uuid()` | — | `Validator<string>` |
| `guid()` | — | `Validator<string>` |

### Chainable Methods (Shared)

Every validator has: `.optional()`, `.default(v)`, `.describe(t)`, `.secret()`, `.validate(fn)`

**IMPORTANT — Chain order:** `.min()`, `.url()`, `.email()` (validator-specific refinements) must come BEFORE `.secret()`, `.optional()`, `.describe()`. Reason: `.secret()` returns a generic `Validator & ChainableMethods` which loses type-specific methods like `.min()`.

✅ Correct: `string().min(32).secret()`
❌ Wrong: `string().secret().min(32)` — `.min()` won't exist

### defineEnv()

```ts
import { defineEnv, string, number, pick } from "@ctroenv/core"

const env = defineEnv({
  DATABASE_URL: string().url(),
  PORT: number().port().default(3000),
  NODE_ENV: pick(["dev", "prod"] as const),
})

env.DATABASE_URL // string — TypeScript infers this
env.PORT         // number
env.NODE_ENV     // "dev" | "prod"
```

**Options:** `source` (EnvSource or plain object), `prefix` (string prepended to key lookups), `maskWith` (custom mask string for secret values)

**Sources:** `detectSource()` (auto: `import.meta.env` → `Deno.env` → `Bun.env` → `process.env`), `objectSource(obj)`, `workersSource(env)` (Cloudflare Workers), `nodeSource()` (`@ctroenv/node`), `viteSource()` (`@ctroenv/vite`)

**Returns:** `EnvResult<T>` — a read-only object. If any `.secret()` vars exist, wrapped in a Proxy that masks reads with `"********"`.

### Secret Masking

```ts
const env = defineEnv({ JWT_SECRET: string().secret() })
env.JWT_SECRET          // "********"
env.meta.get("JWT_SECRET") // actual value
env.meta.keys()         // ["JWT_SECRET"]
env.meta.has("K")       // boolean
env.meta.toJSON()       // { JWT_SECRET: "actual" }
JSON.stringify(env)     // {"JWT_SECRET":"********"} — meta is non-enumerable
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

const env = defineEnv(schema)
```

`extendSchema` merges with spread; extension keys override base. Dev-mode warns on conflicts.

### Client/Server Schema

```ts
import { type ClientServerSchema, type InferredClientServerEnv } from "@ctroenv/core"

type Schema = ClientServerSchema
// { client: SchemaDefinition, server: SchemaDefinition }

// Inferred type merges both:
type Env = InferredClientServerEnv<Schema>
// { DATABASE_URL: string; NEXT_PUBLIC_API_URL: string; ... }
```

Used by framework adapters (Next.js, Vite). Adapters own visibility logic — core defines the shape.

### Error Handling

```ts
import { CtroEnvError, formatErrors } from "@ctroenv/core"

try { defineEnv(schema, { source }) }
catch (e) {
  if (e instanceof CtroEnvError) {
    console.log(formatErrors(e.errors)) // colored grouped output
    e.errors.forEach(err => {
      err.key       // variable name
      err.message   // description
      err.code      // ErrorCode enum
    })
  }
}
```

**Error codes:** `missing_required`, `type_mismatch`, `invalid_value`, `validation_failed`

### Framework Adapters

| Package | Import | Source |
|---------|--------|--------|
| `@ctroenv/node` | `loadEnv()`, `parseEnvFile()` | `process.env` + `.env` files; `loadEnv({ native })` for system env |
| `@ctroenv/vite` | `viteSource()`, `ctroenvPlugin()` | `import.meta.env` |
| `@ctroenv/nextjs` | `defineEnv()`, `withCtroEnv()` | Server/client split |

### CLI (`@ctroenv/cli`)

```bash
ctroenv validate   # Validate env against schema (--source, --watch, --json, --strict)
ctroenv generate   # Generate .env.example from schema (--output, --no-comments)
ctroenv check      # Diff .env vs schema, CI-friendly (--source, --json, --strict)
ctroenv docs       # Generate ENVIRONMENT.md (--output, --format markdown|json)
ctroenv init       # Scaffold ctroenv.config (--ts, --js, --json, --minimal)
```

**Config file** (`ctroenv.config.ts`, `ctroenv.config.js`, `ctroenv.json`):
```ts
import { defineConfig } from "@ctroenv/cli"
export default defineConfig({
  schema: "./src/env.ts",
  secrets: { mask: ["EXTRA_KEY"], maskWith: "***" },
})
```

### Custom Validators

```ts
import { createValidator, applyChain, parseOk, parseFail, singleError, errInvalid, errMissing, errWrap, errType } from "@ctroenv/core"

function semver() {
  const base = createValidator<string>(
    (input, ctx) => typeof input !== "string"
      ? singleError(errType(ctx.key, typeof input, "semver"))
      : /^\d+\.\d+\.\d+$/.test(input)
        ? parseOk(input)
        : singleError(errInvalid(ctx.key, input, "not valid semver")),
    { typeLabel: "semver" },
  )
  return applyChain(base)
}
```

## Key Files

| Path | Purpose |
|------|---------|
| `packages/core/src/` | Schema engine, validators, defineEnv, errors |
| `packages/cli/src/` | CLI commands and config |
| `packages/node/src/` | Node.js adapter (process.env + .env files) |
| `packages/vite/src/` | Vite adapter + build plugin |
| `packages/nextjs/src/` | Next.js adapter (server/client split) |
| `packages/shared/src/` | Internal shared utilities (logger) |
| `examples/` | 6 complete example projects |
| `apps/docs/content/docs/` | Full documentation (MDX files) |
| `.opencode/skills/ctroenv/` | Deep-dive agent skill with examples |

## Build & Test

- Test: `npx vitest run packages/<name>`
- Typecheck: `cd packages/<name> && npx tsc --noEmit`
- Build: `cd packages/<name> && npx tsup`
- Size: `cd packages/<name> && npx size-limit`
- Lint: `npx @biomejs/biome check packages/<name>/src`
