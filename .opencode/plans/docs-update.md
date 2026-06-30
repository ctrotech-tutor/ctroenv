# Docs Update Execution Plan — v1.9.0

> Files at `apps/docs/content/v1/docs/`

---

## Phase 1 — Fix Inaccuracies (9 files)

### 1. `core/define-env.mdx` — Add `maskWith` option

**Change 1:** In the `DefineEnvOptions` interface, add `maskWith?: string`:

```ts
interface DefineEnvOptions {
  source?: EnvSource | Record<string, string | undefined>
  prefix?: string
  maskWith?: string
}
```

**Change 2:** Add to options table:

```
| `maskWith` | `string` | `"********"` | Custom mask string for secret values |
```

**Change 3:** After the `prefix` section, add:

```mdx
#### maskWith

Overrides the default mask string `"********"` used for `.secret()` values:

```ts
const env = defineEnv(schema, { maskWith: "***" })
env.JWT_SECRET // "***"
```
```

---

### 2. `core/string.mdx` — Add `.hostname()` + chain order warning

**Change 1:** Update the refinements intro paragraph (line 29) to include `.hostname()`:

Before:
```
Chain `.min()`, `.max()`, `.url()`, `.email()`, `.port()`, `.regex()` before `.secret()`, `.optional()`, `.describe()`.
```

After:
```
Chain `.min()`, `.max()`, `.url()`, `.email()`, `.port()`, `.hostname()`, `.regex()` before `.secret()`, `.optional()`, `.describe()`.
```

**Change 2:** Add `.hostname()` section after `.port()` and before `.min()`:

```mdx
### .hostname()

Requires the value to be a valid RFC 1123 hostname:

```ts
const env = defineEnv({
  SERVICE_HOST: string().hostname(),
})
// ✅ "example.com"
// ✅ "my-service.internal"
// ✅ "localhost"
// ❌ "-invalid"
// ❌ "host name"
// ❌ "a-very-long-label-that-exceeds-sixty-three-characters.example.com"
```
```

**Change 3:** Add chain order warning as a prominent note after the refinements list:

After the `.regex()` section and before "return value: StringValidator":

```mdx
> **Chain order matters:** Refinements (`.min()`, `.max()`, `.url()`, `.email()`, `.port()`, `.hostname()`, `.regex()`) must come **before** `.secret()`, `.optional()`, or `.describe()`. Reason: `.secret()` and `.optional()` return a generic wrapper that drops type-specific methods.
> 
> ```ts
> // ✅ Correct
> string().url().min(1).secret()
> 
> // ❌ Wrong — .min() won't exist
> string().secret().url().min(1)
> ```
```

---

### 3. `core/chainable.mdx` — Add chain order subsection

**Change 1:** After the `.describe()` section (before `.secret()`), insert:

```mdx
## Chain Order

Validator-specific refinements (`.url()`, `.min()`, `.email()`, `.hostname()`, etc.) must be chained **before** `.secret()`, `.optional()`, or `.describe()`. This is because `.secret()` and `.optional()` return a generic `Validator & ChainableMethods` wrapper that no longer has type-specific methods like `.min()` or `.url()`.

```ts
// ✅ Correct — refinements first, then modifiers
string().url().min(1).secret()
number().int().positive().optional()

// ❌ Wrong — .min() won't exist on the generic wrapper
string().secret().url().min(1)
//          ~~~~~~~ ~~~~~~~ ~~~~~~
//          Error: Property 'url' does not exist on type 'Validator<string> & ChainableMethods<string>'
```

The same applies to all validators with type-specific refinements.
```

---

### 4. `getting-started/core-concepts.mdx` — Add 6 missing validators

**Change 1:** Update the validator table (line 16-21):

Before (4 rows):

```
| `string()` | `string` | Accepts string values |
| `number()` | `number` | Accepts numbers and numeric strings (coerces) |
| `boolean()` | `boolean` | Accepts booleans, "true"/"false", "1"/"0" (coerces) |
| `pick([...])` | `"a" \| "b" \| ...` | Accepts only specific string values |
```

After (10 rows):

```
| `string()` | `string` | Accepts string values |
| `number()` | `number` | Accepts numbers and numeric strings (coerces) |
| `boolean()` | `boolean` | Accepts booleans, "true"/"false", "1"/"0" (coerces) |
| `pick([...])` | `"a" \| "b" \| ...` | Accepts only specific string values |
| `semver()` | `string` | Strict semver (no ranges, no `v` prefix) |
| `ip()` | `string` | Accepts IPv4 or IPv6 |
| `ipv4()` | `string` | Strict IPv4 only |
| `ipv6()` | `string` | Strict IPv6 (rejects zone indices) |
| `uuid()` | `string` | RFC 9562 UUID (any version) |
| `guid()` | `string` | Permissive GUID (case-insensitive, with/without braces) |
```

**Change 2:** Add a footnote after the table:

> These validators were added in v1.9.0. See the individual pages for details.

---

### 5. `node.mdx` — Add `native` option

**Change 1:** Add `native?: boolean` to the `LoadEnvOptions` interface:

```ts
interface LoadEnvOptions {
  path?: string
  encoding?: BufferEncoding
  override?: boolean
  system?: boolean
  native?: boolean
}
```

**Change 2:** Add to options table:

```
| `native` | `boolean` | `false` | Use `process.loadEnvFile()` when available (Node 21.7+) |
```

**Change 3:** After the "Override Behavior" section, add:

```mdx
### Native Mode

When `native: true`, the adapter uses Node.js built-in `process.loadEnvFile()` (available in Node 21.7+). If the native API is unavailable, it falls back to the custom parser:

```ts
const source = loadEnv({ native: true })
```
```

---

### 6. `vite.mdx` — Add `maskWith` option

**Change 1:** Update the interface to include `maskWith`:

```ts
interface CtroEnvPluginOptions {
  schema: string | SchemaDefinition
  failOnError?: boolean
  maskWith?: string
}
```

**Change 2:** Add to options table:

```
| `maskWith` | `string` | `"********"` | Custom mask string for secret values |
```

**Change 3:** Add after the failOnError description:

```mdx
### Custom Mask

Override the default `"********"` mask for secret values:

```ts
ctroenvPlugin({
  schema: "./src/env.ts",
  maskWith: "***",
})
```
```

---

### 7. `nextjs.mdx` — Add `maskWith` + `InferredNextEnv`

**Change 1:** Update the `defineEnv()` signature section. Replace the current type inference block (lines 97-109) with:

```mdx
## defineEnv()

Returns a proxied environment object that enforces server/client boundaries:

```ts
import { defineEnv } from "@ctroenv/nextjs"

const env = defineEnv(schema)
const envMasked = defineEnv(schema, { maskWith: "***" })
```

| Option | Type | Default | Description |
|---|---|---|---|
| `maskWith` | `string` | `"********"` | Custom mask string for secret values |
```

**Change 2:** Add type section after "Best Practices" (before closing):

```mdx
## Types

```ts
import type { InferredNextEnv } from "@ctroenv/nextjs"
// Type alias for InferredClientServerEnv from @ctroenv/core

import type { ClientServerSchema } from "@ctroenv/core"
// Preferred over the deprecated NextSchemaDefinition
```

> `NextSchemaDefinition` is deprecated — use `ClientServerSchema` from `@ctroenv/core` instead.
```

---

### 8. `cli/check.mdx` — Add `--warn-unknown`

**Change 1:** Add to the options table:

```
| `--warn-unknown` | `boolean` | `false` | Warn about keys in source not in schema (with "did you mean?" suggestions) |
```

**Change 2:** After "Strict Mode" section, add:

```mdx
### Unknown Key Warnings

With `--warn-unknown`, the command reports keys found in the source file that are not defined in the schema. When a close match is detected via Levenshtein distance, a "did you mean?" suggestion is shown:

```bash
ctroenv check --source .env --warn-unknown
# ⚠ Unknown key: "DATABSE_URL"
#   → Did you mean "DATABASE_URL"?
```
```

---

### 9. `cli/configuration.mdx` — Clarify default schema path

Already shows `"./src/env.ts"` as default (line 74) — this matches what init generates. No change needed.

---

## Phase 2 — New Pages (4 files)

### 10. `core/semver.mdx` (NEW)

```
---
title: "semver()"
description: "Create a strict semver validator that validates semantic version strings."
---
# semver()

Creates a validator that accepts strict semver strings.

## Signature

```ts
function semver(): SemverValidator
```

## Accepted Values

Only exact `X.Y.Z` format is accepted. No `v` prefix, no ranges (`^`, `~`), no pre-release tags, no build metadata.

| Input | Result |
|---|---|
| `"1.0.0"` | ✅ `"1.0.0"` |
| `"0.0.1"` | ✅ `"0.0.1"` |
| `"999.999.999"` | ✅ `"999.999.999"` |
| `"v1.0.0"` | ❌ Invalid — `v` prefix not allowed |
| `"1.0"` | ❌ Invalid — must have three parts |
| `"1.0.0-beta"` | ❌ Invalid — pre-release not allowed |
| `"^1.0.0"` | ❌ Invalid — range not allowed |
| `"abc"` | ❌ Type error — not a semver string |

## Refinements

`semver()` has no type-specific refinements. It supports only the [chainable methods](/docs/core/chainable) (`.optional()`, `.default()`, `.describe()`, `.secret()`, `.validate()`).

## Examples

### Basic semver

```ts
const env = defineEnv({
  APP_VERSION: semver(),
})
// env.APP_VERSION: string
```

### With defaults

```ts
const env = defineEnv({
  API_VERSION: semver().default("1.0.0"),
})
// env.API_VERSION: string (default: "1.0.0")
```

### Optional

```ts
const env = defineEnv({
  SCHEMA_VERSION: semver().optional(),
})
// env.SCHEMA_VERSION: string | undefined
```
```

---

### 11. `core/ip.mdx` (NEW)

```
---
title: "ip(), ipv4(), ipv6()"
description: "Create IP address validators that accept IPv4, IPv6, or both."
---
# ip(), ipv4(), ipv6()

Creates validators that accept IP address strings.

## Signature

```ts
function ip(): IpValidator
function ipv4(): IpValidator
function ipv6(): IpValidator
```

## Accepted Values

### `ip()`

Accepts valid IPv4 or IPv6 addresses:

| Input | Result |
|---|---|
| `"192.168.1.1"` | ✅ |
| `"::1"` | ✅ |
| `"2001:db8::1"` | ✅ |
| `"10.0.0.1"` | ✅ |
| `"localhost"` | ❌ Not an IP |
| `"256.0.0.1"` | ❌ Invalid IPv4 octet |

### `ipv4()`

Accepts only strict IPv4 dotted-decimal addresses:

| Input | Result |
|---|---|
| `"192.168.1.1"` | ✅ |
| `"127.0.0.1"` | ✅ |
| `"0.0.0.0"` | ✅ |
| `"::1"` | ❌ IPv6 not accepted |
| `"localhost"` | ❌ Not an IP |
| `"10.0"` | ❌ Incomplete |

### `ipv6()`

Accepts only strict RFC 3986 IPv6 addresses. Zone indices (like `%eth0`) are **rejected**:

| Input | Result |
|---|---|
| `"::1"` | ✅ |
| `"2001:db8::1"` | ✅ |
| `"fe80::1"` | ✅ |
| `"fe80::1%eth0"` | ❌ Zone index rejected |
| `"192.168.1.1"` | ❌ IPv4 not accepted |
| `"::"` | ✅ Unspecified address |

## Refinements

IP validators have no type-specific refinements. They support only the [chainable methods](/docs/core/chainable) (`.optional()`, `.default()`, `.describe()`, `.secret()`, `.validate()`).

## Examples

### Basic IP validation

```ts
const env = defineEnv({
  BIND_ADDRESS: ip(),
  PRIMARY_DNS: ipv4(),
  LINK_LOCAL: ipv6().optional(),
})
```

### Combined with secret

```ts
const env = defineEnv({
  PROXY_IP: ip().secret(),
})
```
```

---

### 12. `core/uuid.mdx` (NEW)

```
---
title: "uuid(), guid()"
description: "Create UUID and GUID validators for RFC 9562 and permissive formats."
---
# uuid(), guid()

Creates validators that accept UUID and GUID strings.

## Signature

```ts
function uuid(): UuidValidator
function guid(): UuidValidator
```

## Accepted Values

### `uuid()`

Accepts RFC 9562 UUIDs. Must be lowercase, use hyphens, and contain only hex characters:

| Input | Result |
|---|---|
| `"550e8400-e29b-41d4-a716-446655440000"` | ✅ UUID v4 |
| `"00000000-0000-0000-0000-000000000000"` | ✅ Nil UUID |
| `"550E8400-E29B-41D4-A716-446655440000"` | ❌ Uppercase not accepted |
| `"550e8400e29b41d4a716446655440000"` | ❌ No hyphens |
| `"not-a-uuid"` | ❌ Not a UUID |

### `guid()`

Permissive GUID format. Case-insensitive, with or without braces:

| Input | Result |
|---|---|
| `"550e8400-e29b-41d4-a716-446655440000"` | ✅ |
| `"{550e8400-e29b-41d4-a716-446655440000}"` | ✅ With braces |
| `"{550E8400-E29B-41D4-A716-446655440000}"` | ✅ Uppercase accepted |
| `"550e8400e29b41d4a716446655440000"` | ❌ No hyphens |

## Refinements

UUID validators have no type-specific refinements. They support only the [chainable methods](/docs/core/chainable) (`.optional()`, `.default()`, `.describe()`, `.secret()`, `.validate()`).

## Examples

```ts
const env = defineEnv({
  SESSION_ID: uuid(),
  CORRELATION_ID: uuid().optional(),
  LEGACY_GUID: guid().describe("Legacy GUID format identifier"),
})
```
```

---

### 13. `core/custom-validators.mdx` (NEW)

```
---
title: "Custom Validators"
description: "Build your own validators with createValidator, applyChain, and validation helpers."
---
# Custom Validators

When the built-in validators don't cover your use case, you can build custom ones using `createValidator()` and the helper functions.

## createValidator()

Creates a base validator with a custom parse function:

```ts
function createValidator<T>(
  parse: (input: unknown, context: ParseContext) => ParseResult<T>,
  opts?: { typeLabel?: string },
): Validator<T>
```

The `parse` function receives:
- `input` — the raw value (always `unknown`)
- `context` — `{ key: string }` (the env variable name, useful for error messages)

It must return a `ParseResult<T>`:
- `parseOk(value)` — validation passed
- `singleError(error)` — validation failed with a single error
- `parseFail(errors)` — validation failed with multiple errors

## Helper Functions

### `parseOk(value)`

Signals successful parsing:

```ts
import { parseOk } from "@ctroenv/core"
return parseOk("parsed-value")
```

### `singleError(error)`

Signals a single validation error:

```ts
import { singleError } from "@ctroenv/core"
return singleError({
  key: ctx.key,
  message: "Value must be at least 10 characters",
  code: "invalid_value",
})
```

### `errInvalid(key, value, message)`

Creates a `ValidationError` for an invalid value:

```ts
import { errInvalid } from "@ctroenv/core"
return singleError(errInvalid(ctx.key, input, "not a valid format"))
```

### `errType(key, received, expected)`

Creates a `ValidationError` for a type mismatch:

```ts
import { errType } from "@ctroenv/core"
return singleError(errType(ctx.key, typeof input, "semver"))
```

## applyChain()

Wraps a base validator with the standard chainable methods (`.optional()`, `.default()`, `.describe()`, `.secret()`, `.validate()`):

```ts
function applyChain<T>(validator: Validator<T>): Validator<T> & ChainableMethods<T>
```

## Full Example

Building a `semver()` validator from scratch:

```ts
import {
  createValidator, applyChain, parseOk, singleError,
  errInvalid, errType,
} from "@ctroenv/core"

function semver() {
  const base = createValidator<string>(
    (input, ctx) => {
      if (typeof input !== "string") {
        return singleError(errType(ctx.key, typeof input, "semver"))
      }
      if (!/^\d+\.\d+\.\d+$/.test(input)) {
        return singleError(errInvalid(ctx.key, input, "not a valid semver"))
      }
      return parseOk(input)
    },
    { typeLabel: "semver" },
  )
  return applyChain(base)
}

// Usage:
const env = defineEnv({
  APP_VERSION: semver(),
  API_VERSION: semver().optional(),
})
```

## Types

```ts
import type {
  Validator,       // Generic validator: { parse(input, ctx): ParseResult<T>, metadata: ValidatorMetadata }
  ParseResult,     // ParseResultOk<T> | ParseResultFail
  ParseContext,    // { key: string }
  ValidatorMetadata, // { typeLabel, isSecret, isOptional, hasDefault, defaultValue, description }
} from "@ctroenv/core"
```
```

---

## Phase 3 — Config Updates (2 files)

### 14. `content/v1/docs/meta.json`

Replace the `pages` array with updated ordering:

```json
{
  "pages": [
    "getting-started",
    "getting-started/quick-start",
    "getting-started/core-concepts",
    "core/define-env",
    "core/string",
    "core/number",
    "core/boolean",
    "core/semver",
    "core/pick",
    "core/ip",
    "core/uuid",
    "core/chainable",
    "core/refinements",
    "core/errors",
    "core/schema-composition",
    "core/custom-validators",
    "cli/index",
    "cli/validate",
    "cli/generate",
    "cli/check",
    "cli/docs",
    "cli/init",
    "cli/configuration",
    "node",
    "vite",
    "nextjs",
    "migration/from-t3-env",
    "migration/from-envalid",
    "migration/from-dotenv"
  ]
}
```

### 15. `lib/navigation.ts`

In the "Core API" sidebar section, replace the items array:

Before:
```
items: [
  { title: "defineEnv", href: "/docs/core/define-env" },
  { title: "string()", href: "/docs/core/string" },
  { title: "number()", href: "/docs/core/number" },
  { title: "boolean()", href: "/docs/core/boolean" },
  { title: "pick()", href: "/docs/core/pick" },
  { title: "Chainable Methods", href: "/docs/core/chainable" },
  { title: "Refinements", href: "/docs/core/refinements" },
  { title: "Error Handling", href: "/docs/core/errors" },
],
```

After:
```
items: [
  { title: "defineEnv", href: "/docs/core/define-env" },
  { title: "string()", href: "/docs/core/string" },
  { title: "number()", href: "/docs/core/number" },
  { title: "boolean()", href: "/docs/core/boolean" },
  { title: "semver()", href: "/docs/core/semver" },
  { title: "pick()", href: "/docs/core/pick" },
  { title: "ip(), ipv4(), ipv6()", href: "/docs/core/ip" },
  { title: "uuid(), guid()", href: "/docs/core/uuid" },
  { title: "Chainable Methods", href: "/docs/core/chainable" },
  { title: "Refinements", href: "/docs/core/refinements" },
  { title: "Error Handling", href: "/docs/core/errors" },
  { title: "Schema Composition", href: "/docs/core/schema-composition" },
  { title: "Custom Validators", href: "/docs/core/custom-validators" },
],
```

---

## Execution Order

1. Phase 1 (fixes) — 9 files, edit in place
2. Phase 2 (new pages) — 4 files, create new
3. Phase 3 (config) — update meta.json + navigation.ts
4. Run `npm run typecheck` to verify no broken links
5. Run `npm run build` to verify docs site builds
