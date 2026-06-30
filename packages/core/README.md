# @ctroenv/core

[![npm version](https://img.shields.io/npm/v/@ctroenv/core)](https://www.npmjs.com/package/@ctroenv/core)
[![npm downloads](https://img.shields.io/npm/dw/@ctroenv/core)](https://www.npmjs.com/package/@ctroenv/core)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@ctroenv/core)](https://bundlephobia.com/package/@ctroenv/core)
[![license](https://img.shields.io/npm/l/@ctroenv/core)](https://github.com/ctrotech-tutor/ctroenv/blob/main/LICENSE)

Define, validate, and infer types for environment variables. **Zero runtime dependencies** — 4 KB gzip.

## Features

- **Zero dependencies** — no runtime deps, not even as peer dependencies
- **Full TypeScript inference** — exact literal types inferred from your schema
- **Rich error messages** — grouped by category with actionable suggestions
- **Chainable API** — `string().url().min(1).optional()`
- **Secret masking** — sensitive values masked in logs and console output
- **Schema composition** — reusable schemas with `defineSchema` / `extendSchema`
- **Custom validators** — build your own with `createValidator` / `applyChain`
- **Framework adapters** — Node, Vite, Next.js (separate packages)
- **CLI tooling** — validate, generate, check, docs, init (separate package)

## Installation

```bash
npm install @ctroenv/core
```

## Quick Start

```ts
import { defineEnv, string, number, pick } from "@ctroenv/core"

const env = defineEnv({
  DATABASE_URL: string().url().describe("Primary database connection"),
  PORT: number().port().default(3000),
  NODE_ENV: pick(["development", "staging", "production"]),
  JWT_SECRET: string().secret().min(32),
})

// TypeScript infers exact types:
env.DATABASE_URL // string
env.PORT         // number
env.NODE_ENV     // "development" | "staging" | "production"
```

## Validators

| Validator | Type | Refinements |
|-----------|------|-------------|
| `string()` | `string` | `.url()`, `.email()`, `.port()`, `.hostname()`, `.min()`, `.max()`, `.regex()` |
| `number()` | `number` | `.int()`, `.positive()`, `.port()`, `.min()`, `.max()` |
| `boolean()` | `boolean` | Coerces `true`/`false`, `"true"`/`"false"`, `"yes"`/`"no"`, `"on"`/`"off"`, `1`/`0`, `"y"`/`"n"`, `"t"`/`"f"` |
| `pick([...])` | union literal | Enum validation from a string list |
| `semver()` | `string` | Strict semver (no ranges, no `v` prefix) |
| `ip()` | `string` | Accepts IPv4 or IPv6 |
| `ipv4()` | `string` | Strict IPv4 |
| `ipv6()` | `string` | Strict IPv6 (rejects zone indices like `%eth0`) |
| `uuid()` | `string` | RFC 9562 UUID (any version, lowercase) |
| `guid()` | `string` | Permissive GUID (case-insensitive, with/without braces) |

### Chainable Methods

Every validator supports: `.optional()`, `.default(v)`, `.describe(text)`, `.secret()`, `.validate(fn)`

> **Chain order matters:** Validator-specific refinements (`.url()`, `.min()`, `.email()`, etc.) must come **before** `.secret()`, `.optional()`, or `.describe()`. Reason: `.secret()` returns a generic wrapper that loses type-specific methods.

```ts
// ✅ Correct
string().url().min(1).secret()

// ❌ Wrong — .min() won't exist
string().secret().url().min(1)
```

## API

### `defineEnv(schema, opts?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `source` | `EnvSource \| Record<string, string \| undefined>` | Auto-detected | Where to read env values from |
| `prefix` | `string` | — | Prepended to key lookups in the source |
| `maskWith` | `string` | `"********"` | Custom mask string for secret values |

```ts
const env = defineEnv(
  { DATABASE_URL: string().url() },
  { source: loadEnv(), prefix: "MY_APP_", maskWith: "***" },
)
```

### `watchEnv(schema, opts?)`

Re-validates environment variables when the source changes. Useful for long-running processes (servers, CLIs, watchers).

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `source` | `EnvSource` | Auto-detected | Env source to watch |
| `pollInterval` | `number` | `2000` | Poll interval in ms |
| `onChange` | `(key, oldVal, nextVal) => void` | — | Called when a value changes |
| `signal` | `AbortSignal` | — | Stop watching on abort |

```ts
import { watchEnv, string, number } from "@ctroenv/core"

const env = watchEnv({
  DATABASE_URL: string().url(),
  PORT: number().port().default(3000),
}, {
  onChange: (key, old, next) => console.log(`${key} changed`),
})

// env refreshes automatically when source changes
```

### Source Functions

| Function | Description |
|----------|-------------|
| `detectSource()` | Auto-detect source (process.env, import.meta.env, etc.) |
| `objectSource(obj)` | Create an `EnvSource` from a plain object |
| `workersSource(env)` | Create an `EnvSource` from a Cloudflare Workers env binding |

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

### Custom Validators

```ts
import { createValidator, applyChain, parseOk, singleError, errInvalid, errType } from "@ctroenv/core"

function semver() {
  const base = createValidator<string>(
    (input, ctx) =>
      typeof input !== "string"
        ? singleError(errType(ctx.key, typeof input, "semver"))
        : /^\d+\.\d+\.\d+$/.test(input)
          ? parseOk(input)
          : singleError(errInvalid(ctx.key, input, "not valid semver")),
    { typeLabel: "semver" },
  )
  return applyChain(base)
}
```

### Error Handling

| Class / Function | Description |
|-----------------|-------------|
| `CtroEnvError` | Error class containing all validation errors |
| `formatErrors(errors)` | Format errors for CLI output (grouped, colorized) |
| `ValidationError` | Single validation error: `{ key, message, code, value?, originalValue?, suggestion? }` |
| `ErrorCode` | Enum: `missing_required`, `type_mismatch`, `invalid_value`, `validation_failed` |

```ts
import { CtroEnvError, formatErrors } from "@ctroenv/core"

try {
  const env = defineEnv(schema)
} catch (e) {
  if (e instanceof CtroEnvError) {
    console.error(formatErrors(e.errors))
  }
}
```

### Types

| Type | Description |
|------|-------------|
| `SchemaDefinition` | Object mapping keys to validators |
| `Validator<T>` | Generic validator type with metadata |
| `EnvResult<T>` | Read-only env object with inferred types |
| `EnvMeta` | Metadata accessor: `.get()`, `.has()`, `.keys()`, `.toJSON()` |
| `EnvSource` | Source interface: `{ get(key: string): string \| undefined }` |
| `ClientServerSchema` | `{ client: SchemaDefinition, server: SchemaDefinition }` |
| `InferredClientServerEnv<T>` | Merged inferred type from client/server schemas |
| `DefineEnvOptions` | Options for `defineEnv()` |
| `ParseResult` | `{ success: true, value: T, errors: [] } \| { success: false, errors: ValidationError[] }` |
| `ParseContext` | Context passed to validator parse functions |

## Documentation

Full documentation at [ctroenv.vercel.app](https://ctroenv.vercel.app)

## License

MIT
