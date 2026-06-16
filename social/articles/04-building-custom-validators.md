---
title: Building Your Own CtroEnv Validators
published: false
description: How CtroEnv validators work internally, the createValidator and applyChain APIs, and how to build and publish custom validators for domain-specific needs.
tags: typescript, nodejs, tutorial, opensource, javascript
series: Mastering Environment Variables in TypeScript with CtroEnv
cover_image: https://ctroenv.vercel.app/og.png
---

The four built-in validators — `string()`, `number()`, `boolean()`, and `pick()` — cover the most common environment variable patterns. But real-world applications have real-world specific needs:

- A `semver()` validator that checks `"1.2.3"` format
- An `ip()` validator that accepts IPv4 and IPv6 addresses
- An `awsArn()` validator for `arn:aws:iam::123456789012:role/MyRole`
- A `jwt()` validator that ensures a string is a valid JWT (three dot-separated base64 segments)
- A `hexColor()` validator for `#rrggbb` or `#rgb` format

In this article, we'll walk through CtroEnv's validator internals and build several custom validators from scratch.

---

## How a Validator Works

At its core, a CtroEnv validator is an object with three things:

```typescript
interface Validator<T> {
  /** Phantom type for TypeScript inference */
  readonly _type: T

  /** The validation function */
  parse(input: unknown, context: ParseContext): ParseResult<T>

  /** Metadata about this validator */
  readonly metadata: ValidatorMetadata
}
```

### `parse()`

The heart of a validator. It receives the raw input (a string from the environment, or any value if using a custom source) and returns either success or failure:

```typescript
interface ParseContext {
  key: string
  path: readonly string[]
}

type ParseResult<T> = ParseResultOk<T> | ParseResultFail

interface ParseResultOk<T> {
  success: true
  value: T
  errors: readonly ValidationError[]
}

interface ParseResultFail {
  success: false
  value?: unknown
  errors: readonly ValidationError[]
}
```

Two helper functions create these results:

```typescript
import { parseOk, singleError } from "@ctroenv/core"

// Success
parseOk("hello")   // { success: true, value: "hello", errors: [] }

// Failure (wraps a single ValidationError)
singleError(someError)  // { success: false, errors: [someError] }
```

### `metadata`

Provides information for documentation and error messages:

```typescript
interface ValidatorMetadata {
  description?: string
  optional: boolean
  hasDefault: boolean
  defaultValue?: unknown
  isSecret: boolean
  typeLabel: string
}
```

---

## Building a Custom Validator with `createValidator`

The simplest way to create a custom validator is with the `createValidator()` function:

```typescript
import { createValidator, parseOk, singleError, errType, errInvalid } from "@ctroenv/core"
```

Let's build a `semver()` validator that checks `MAJOR.MINOR.PATCH` format:

```typescript
import { createValidator, parseOk, singleError, errType, errInvalid } from "@ctroenv/core"

function semver() {
  const pattern = /^\d+\.\d+\.\d+$/

  return createValidator<string>(
    (input: unknown, context: { key: string; path: readonly string[] }) => {
      if (typeof input !== "string") {
        return singleError(
          errType(context.key, typeof input, "a semver string", {
            suggestion: "Use format MAJOR.MINOR.PATCH (e.g., '1.2.3').",
          }),
        )
      }

      if (!pattern.test(input)) {
        return singleError(
          errInvalid(context.key, input, `"${input}" is not a valid semver version`, {
            suggestion: "Use format MAJOR.MINOR.PATCH (e.g., '1.2.3').",
          }),
        )
      }

      return parseOk(input)
    },
    { typeLabel: "semver" },
  )
}
```

Now use it in a schema:

```typescript
import { defineEnv, string } from "@ctroenv/core"

const env = defineEnv({
  API_VERSION: semver().default("1.0.0"),
  APP_VERSION: semver().describe("Application release version"),
})
```

Wait — this won't compile. `semver()` returns a `Validator<string>`, but it doesn't have `.default()` or `.describe()`. Those methods come from `ChainableMethods`, which we need to add.

---

## Adding Chainable Methods with `applyChain`

The `applyChain()` function wraps a validator and adds the chainable method set (`.optional()`, `.default()`, `.describe()`, `.secret()`, `.validate()`):

```typescript
import { applyChain } from "@ctroenv/core"

function semver() {
  const base = createValidator<string>(
    (input, context) => {
      // ... validation logic ...
    },
    { typeLabel: "semver" },
  )

  return applyChain(base)
}
```

Now `.default()`, `.describe()`, `.optional()`, `.secret()`, and `.validate()` all work. The return type is `Validator<string> & ChainableMethods<string>`.

---

## Adding Refinement Methods

To add refinement methods (like `.min()` on StringValidator or `.int()` on NumberValidator), we need to extend the validator with additional methods after wrapping:

```typescript
interface SemverValidator extends Validator<string>, ChainableMethods<string> {
  major(min: number): SemverValidator
  minor(min: number): SemverValidator
  patch(min: number): SemverValidator
  allowVPrefix(): SemverValidator
}

function semver(): SemverValidator {
  const base = createValidator<string>(
    (input, context) => {
      if (typeof input !== "string") {
        return singleError(
          errType(context.key, typeof input, "a semver string"),
        )
      }
      const cleaned = input.startsWith("v") ? input.slice(1) : input
      const parts = cleaned.split(".").map(Number)
      if (parts.length !== 3 || parts.some(isNaN)) {
        return singleError(
          errInvalid(context.key, input, `"${input}" is not a valid semver`),
        )
      }
      return parseOk(cleaned)
    },
    { typeLabel: "semver" },
  )

  const chainable = applyChain(base)

  const extended = chainable as SemverValidator

  extended.major = (min: number) => {
    const original = extended
    const wrapped = createValidator<string>(
      (input, context) => {
        const result = original.parse(input, context)
        if (!result.success) return result
        const major = Number(result.value.split(".")[0])
        if (major < min) {
          return singleError(
            errInvalid(context.key, result.value, `Major version must be at least ${min}`),
          )
        }
        return result
      },
      original.metadata,
    )
    return applyChain(wrapped) as SemverValidator
  }

  return extended
}
```

This is the same pattern used internally by `StringValidator` and `NumberValidator` — create a base, wrap with `applyChain`, then attach refinement methods that return new instances of the same type.

---

## Writing a Refinement Function

If you don't need a full validator with custom parse logic, you can write a refinement function that wraps an existing validator. This is what the built-in `url()`, `email()`, `min()`, `max()`, and `port()` refinements do:

```typescript
import { string, type Validator } from "@ctroenv/core"

function hexColor(): <T extends string>(v: Validator<T>) => Validator<T> {
  return (validator: Validator<string>) => {
    const original = validator
    const wrapped = createValidator<string>(
      (input, context) => {
        const result = original.parse(input, context)
        if (!result.success) return result
        if (!/^#[0-9a-fA-F]{3,6}$/.test(result.value)) {
          return singleError(
            errInvalid(context.key, result.value, `"${result.value}" is not a valid hex color`, {
              suggestion: "Use #rgb, #rrggbb, or #rrggbbaa format.",
            }),
          )
        }
        return result
      },
      original.metadata,
    )
    return applyChain(wrapped)
  }
}
```

Use it either as a standalone wrapper or via a method on the string validator:

```typescript
// As a wrapper
const env = defineEnv({
  THEME_COLOR: hexColor()(string()).default("#3b82f6"),
})

// If we add it to StringValidator, it would be:
// const env = defineEnv({
//   THEME_COLOR: string().hexColor().default("#3b82f6"),
// })
```

---

## A Complete Example: IP Address Validator

Let's build something more practical — an IP address validator that supports both IPv4 and IPv6:

```typescript
import {
  createValidator,
  applyChain,
  parseOk,
  singleError,
  errType,
  errInvalid,
  type Validator,
  type ChainableMethods,
} from "@ctroenv/core"

interface IpValidator extends Validator<string>, ChainableMethods<string> {
  v4(): IpValidator
  v6(): IpValidator
}

function ip(): IpValidator {
  const base = createValidator<string>(
    (input, context) => {
      if (typeof input !== "string") {
        return singleError(
          errType(context.key, typeof input, "an IP address"),
        )
      }

      // IPv4: four octets
      const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
      const match = input.match(ipv4)
      if (match) {
        const valid = match.slice(1).every((octet) => {
          const n = Number(octet)
          return n >= 0 && n <= 255
        })
        if (!valid) {
          return singleError(
            errInvalid(context.key, input, "IPv4 octets must be between 0 and 255"),
          )
        }
        return parseOk(input)
      }

      // IPv6: simple check (real validation needs RFC 4291)
      if (input.includes(":")) {
        const parts = input.split(":")
        if (parts.length >= 2 && parts.length <= 8) {
          return parseOk(input)
        }
      }

      return singleError(
        errInvalid(context.key, input, `"${input}" is not a valid IP address`),
      )
    },
    { typeLabel: "ip" },
  )

  const chainable = applyChain(base)
  const extended = chainable as IpValidator

  extended.v4 = () => {
    const original = extended
    const wrapped = createValidator<string>(
      (input, context) => {
        const result = original.parse(input, context)
        if (!result.success) return result
        // Ensure it's IPv4 (no colons)
        if (result.value.includes(":")) {
          return singleError(
            errInvalid(context.key, result.value, "Expected IPv4 address, received IPv6"),
          )
        }
        return result
      },
      original.metadata,
    )
    return applyChain(wrapped) as IpValidator
  }

  // .v6() follows the same pattern — check it's not IPv4

  return extended
}
```

Usage:

```typescript
const env = defineEnv({
  TRUSTED_PROXY: ip().v4().describe("Trusted proxy IP (IPv4 only)"),
  DNS_SERVER: ip().optional().describe("Custom DNS server"),
})
```

---

## Error Factories

When building custom validators, you have access to the same error factories used internally:

```typescript
import {
  errMissing,   // "Missing required environment variable: KEY"
  errType,      // "Expected a string, received number"
  errInvalid,   // "Invalid URL"
  errCoerce,    // 'Failed to coerce "foo" to number'
  errWrap,      // Generic wrapper for any ErrorCode
} from "@ctroenv/core"
```

Each factory creates a `ValidationError` with the appropriate `ErrorCode`, message, and an optional `suggestion`:

```typescript
errInvalid(context.key, value, "Custom error message", {
  suggestion: "Here's how to fix it.",
})
```

---

## Publishing Custom Validators

Once you've built a validator, you can publish it as a separate package on npm. The convention is `@ctroenv/community-<name>`:

```json
{
  "name": "@ctroenv/community-ip",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "dependencies": {
    "@ctroenv/core": "^1.0.0"
  }
}
```

```typescript
// src/index.ts
export { ip } from "./ip"
export type { IpValidator } from "./ip"
```

Your package only needs `@ctroenv/core` as a dependency. The custom validator uses the same `createValidator()`, `applyChain()`, and error factories that the built-in validators use.

---

## Summary

| API | Purpose |
|-----|---------|
| `createValidator(parseFn, metadata)` | Create a base validator with custom parse logic |
| `applyChain(validator)` | Add `.optional()`, `.default()`, `.describe()`, `.secret()`, `.validate()` |
| `parseOk(value)` | Return a successful parse result |
| `singleError(error)` | Return a failed parse result with one error |
| `errType`, `errInvalid`, etc. | Create typed `ValidationError` instances |
| Refinement functions | Wrap an existing validator with additional constraints |

The same primitives that built `string()`, `number()`, `boolean()`, and `pick()` are available to you. The only difference between a built-in validator and a community one is which npm package it lives in.

---

## Where to Go From Here

- 📖 [Documentation](https://ctroenv.vercel.app)
- ⭐ [Star the repo](https://github.com/ctrotech-tutor/ctroenv)
- 🐛 [Report issues](https://github.com/ctrotech-tutor/ctroenv/issues)
- 💬 [Contributing guide](https://github.com/ctrotech-tutor/ctroenv/blob/main/CONTRIBUTING.md)

If you build a validator that others might find useful, open a PR or publish it under `@ctroenv/community-*`. The ecosystem is just getting started.

---

*This was the final article in the "Mastering Environment Variables in TypeScript with CtroEnv" series. Thanks for reading!*
