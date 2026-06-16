---
name: ctroenv
version: 1.1.0
description: CtroEnv — TypeScript-first environment variable management toolkit
language: typescript
---

# CtroEnv Skill

This skill provides deep knowledge of the CtroEnv library for AI agents. Load it when writing code that uses `@ctroenv/*` packages.

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| `@ctroenv/core` | 1.1.0 | Schema engine, validators, `defineEnv()`, errors (zero deps) |
| `@ctroenv/cli` | 1.1.0 | CLI tooling (validate, generate, check, docs, init) |
| `@ctroenv/node` | 1.0.2 | Node.js adapter (`loadEnv()`, `nodeSource()`) |
| `@ctroenv/vite` | 1.0.2 | Vite adapter (`viteSource()`, `ctroenvPlugin()`) |
| `@ctroenv/nextjs` | 1.0.2 | Next.js adapter (server/client split) |
| `@ctroenv/shared` | 1.0.2 | Internal shared utilities |

## Complete API Reference

### Exports from `@ctroenv/core`

```ts
// Functions
defineEnv(schema, opts?)        // Validate env, return typed frozen object
defineSchema(schema)            // Typed identity for reusable schema blocks
extendSchema(base, extension)   // Merge two schemas, extension overrides base
createValidator(parseFn, meta)  // Low-level custom validator factory
applyChain(validator)           // Add .optional/.default/.describe/.secret/.validate

// Validator factories
string()                        // String validator with refinements
number()                        // Number validator with refinements
boolean()                       // Boolean validator
pick(values)                    // Enum/union validator

// Standalone refinements (wrap existing validators)
url() email() port() min(n) max(n) integer() regex(p)

// Error handling
CtroEnvError                    // Error class (extends Error, has .errors array)
ValidationError                 // Individual error (key, message, code, value, suggestion)
formatErrors(errors)            // Pretty-print with colors/groups

// Error factories
errMissing(key, opts?)          // "missing_required"
errType(key, received, expected) // "type_mismatch"
errInvalid(key, value, msg)     // "invalid_value"
errCoerce(key, value, type)     // "coercion_failed"
errWrap(key, value, msg, code)  // Generic wrapper

// Types (all exported as types)
EnvMeta                         // { get, has, keys, toJSON }
EnvResult<T>                    // Readonly env object with .meta
Schema<T>                       // Typed schema wrapper
SchemaDefinition                // Record<string, Validator<unknown>>
Validator<T>                    // { _type, parse, metadata }
ValidatorMetadata               // { description, optional, hasDefault, defaultValue, isSecret, typeLabel }
InferredEnv<S>                  // Conditional type (optional → T|undefined, default → T)
ParseContext                    // { key, path }
ParseResult<T>                  // { success, value, errors }
ChainableMethods<T>             // { optional, default, describe, secret, validate }
StringValidator, NumberValidator, BooleanValidator, PickValidator

// Source
EnvSource                       // { get(key): string | undefined }
detectSource()                  // Auto: process.env or import.meta.env
objectSource(record)            // Wrap plain object as EnvSource
```

## Refinements Per Validator

### string()
`.url()` `.email()` `.port()` `.min(n)` `.max(n)` `.regex(pattern)`

### number()
`.int()` `.port()` `.positive()` `.min(n)` `.max(n)`

## Chainable Methods (All Validators)

| Method | Effect | Type Impact |
|--------|--------|-------------|
| `.optional()` | Value can be undefined | Adds `\| undefined` |
| `.default(v)` | Fallback when missing | Removes `\| undefined` |
| `.describe(t)` | Human-readable description | None |
| `.secret()` | Masks value at runtime | None |
| `.validate(fn)` | Custom validation | None |

### Chain Order Constraint

**Validator-specific refinements MUST come before chainable methods.**

✅ `string().url().port().min(1).secret().describe("DB")`
❌ `string().secret().url()` — `.url()` won't exist after `.secret()`

Reason: `.secret()` returns `Validator & ChainableMethods`. It does NOT return `StringValidator`, so `.url()` `.email()` `.min()` `.max()` `.port()` `.regex()` are lost.

Validators affected: `string()`, `number()` — their type-specific refinements are lost after any chainable method.

## Secret Masking

When `.secret()` is used, `defineEnv()` wraps the result in a **Proxy**:

```ts
const env = defineEnv({ KEY: string().secret() })
env.KEY                // "********"
env.meta.get("KEY")    // actual value
env.meta.keys()        // ["KEY"]
JSON.stringify(env)    // {"KEY":"********"}  — meta excluded

// env.meta is non-enumerable:
Object.keys(env)       // ["KEY"]  — no "meta"
```

**Error messages** for secret keys never contain the raw value — always `"********"`.

## Schema Composition (`defineSchema` + `extendSchema`)

```ts
import { defineSchema, extendSchema, defineEnv, string, number } from "@ctroenv/core"

const base = defineSchema({
  DATABASE_URL: string().url(),
  JWT_SECRET: string().secret(),
})

// extendSchema merges; extension keys override base
const apiSchema = extendSchema(base, {
  PORT: number().port().default(3000),
})

const env = defineEnv(apiSchema)
// env.DATABASE_URL → string
// env.PORT → number
```

### Key Conflict Rules
- Extension always wins
- Dev mode (`NODE_ENV=development`) logs warning on conflict
- Chaining: `extendSchema(extendSchema(a, b), c)`

## Framework Adapters

### Node.js (`@ctroenv/node`)

```ts
import { defineEnv } from "@ctroenv/core"
import { loadEnv } from "@ctroenv/node"

const env = defineEnv(schema, { source: loadEnv() })
// loadEnv() reads .env → .env.{NODE_ENV} → .env.local
// loadEnv({ path: "../.." }) for monorepo root
```

### Vite (`@ctroenv/vite`)

```ts
import { ctroenvPlugin } from "@ctroenv/vite"

export default defineConfig({
  plugins: [ctroenvPlugin({ schema: "./src/env.ts", failOnError: true })],
})
```

### Next.js (`@ctroenv/nextjs`)

```ts
import { defineEnv } from "@ctroenv/nextjs"

export const env = defineEnv({
  server: { DATABASE_URL: string().url() },
  client: { NEXT_PUBLIC_URL: string().url() },
})
// Server-only keys throw on client access
```

## CLI

### cmd: `ctroenv validate`
`--source <path>` `.env` file path (default: `process.env`)
`--strict` Treat warnings as errors
`--watch` Watch for changes, re-validate
`--json` JSON output

### cmd: `ctroenv generate`
`--output <path>` Output path (default: `.env.example`)
`--no-comments` Minimal output

### cmd: `ctroenv check` (CI-friendly)
`--source <path>` `.env` file to check (default: `.env`)
`--json` JSON output
Exit code 0 = clean, 1 = differences found

### cmd: `ctroenv docs`
`--output <path>` Output path (default: `ENVIRONMENT.md`)
`--format <format>` `markdown` or `json`

### cmd: `ctroenv init`
`--ts` TypeScript config (default)
`--js` JavaScript config
`--minimal` Minimal config

### Config File (`ctroenv.config.ts`)

```ts
import { defineConfig } from "@ctroenv/cli"
export default defineConfig({
  schema: "./src/env.ts",
  sources: { default: ".env", production: ".env.prod" },
  output: { example: ".env.example", docs: "ENVIRONMENT.md" },
  secrets: { mask: ["EXTRA_KEY"], maskWith: "***" },
})
```

`secrets.mask` — Additional keys to mask beyond schema-level `.secret()`
`secrets.maskWith` — Replacement string (default: `"***"`)

## Error Codes

| Code | When | Factory |
|------|------|---------|
| `missing_required` | Required var not in source | `errMissing` |
| `type_mismatch` | Wrong type (e.g., string for number) | `errType` |
| `invalid_value` | Failed refinement (e.g., invalid URL) | `errInvalid` |
| `validation_failed` | Custom `.validate(fn)` returned error | — |
| `coercion_failed` | Could not coerce (e.g., NaN for number) | `errCoerce` |

## Custom Validators

### Using `createValidator` + `applyChain`

```ts
import { createValidator, applyChain, parseOk, singleError, errInvalid, errType } from "@ctroenv/core"

function hexColor() {
  const base = createValidator<string>(
    (input, ctx) => {
      if (typeof input !== "string")
        return singleError(errType(ctx.key, typeof input, "hex color"))
      if (!/^#[0-9a-fA-F]{3,6}$/.test(input))
        return singleError(errInvalid(ctx.key, input, "not a valid hex color"))
      return parseOk(input)
    },
    { typeLabel: "hexcolor" },
  )
  return applyChain(base)
}
```

### Adding Refinement Methods

```ts
function ip() {
  const base = createValidator<string>(...) // as above
  const chainable = applyChain(base)
  const extended = chainable as typeof chainable & { v4(): typeof chainable }
  extended.v4 = () => {
    const original = chainable
    const wrapped = createValidator<string>(
      (input, ctx) => {
        const r = original.parse(input, ctx)
        if (!r.success) return r
        if (r.value.includes(":")) return singleError(errInvalid(ctx.key, r.value, "not IPv4"))
        return r
      },
      original.metadata,
    )
    return applyChain(wrapped) as typeof chainable & { v4(): typeof chainable }
  }
  return extended
}
```

## Anti-patterns

❌ `process.env.X` directly — use `defineEnv()` for validation
❌ `string().secret().min(10)` — chain order: `.min()` before `.secret()`
❌ Calling `defineEnv()` with different sources — create one env object per process
❌ Mutating the env object — it's read-only (Proxy or frozen)
❌ Passing secret values to `console.log` — use `env.meta.get()` explicitly when needed

## See Also

- `./examples/basic-schema.ts`
- `./examples/monorepo.ts`
- `./examples/custom-validator.ts`
- `./references/error-codes.md`
- `./references/chain-order.md`
