---
title: Building Your Own CtroEnv Validators
description: How CtroEnv validators work internally, the createValidator and applyChain APIs, and how to build and publish custom validators for domain-specific needs.
tags: typescript, nodejs, tutorial, opensource, javascript
series: Mastering Environment Variables in TypeScript with CtroEnv
---

I needed a validator that checks if a string is a valid IPv6 address. The four built-in validators — `string()`, `number()`, `boolean()`, `pick()` — cover the common cases, but this specific case wasn't there.

So I wrote one. Here's how.

## How a Validator Works

A CtroEnv validator is an object with a `parse` function and metadata:

```typescript
interface Validator<T> {
  readonly _type: T
  parse(input: unknown, context: ParseContext): ParseResult<T>
  readonly metadata: ValidatorMetadata
}
```

`parse()` receives the raw input and returns success or failure:

```typescript
interface ParseContext { key: string; path: readonly string[] }

type ParseResult<T> = ParseResultOk<T> | ParseResultFail

interface ParseResultOk<T> { success: true; value: T; errors: readonly ValidationError[] }
interface ParseResultFail { success: false; value?: unknown; errors: readonly ValidationError[] }
```

Two helpers create these results:

```typescript
import { parseOk, singleError } from "@ctroenv/core"

parseOk("hello")   // { success: true, value: "hello", errors: [] }
singleError(err)   // { success: false, errors: [err] }
```

## Building a Custom Validator

`createValidator()` is the simplest path:

```typescript
import { createValidator, parseOk, singleError, errType, errInvalid } from "@ctroenv/core"

function semver() {
  const pattern = /^\d+\.\d+\.\d+$/

  return createValidator<string>(
    (input, context) => {
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

But this returns a bare `Validator<string>` — no `.default()`, `.describe()`, or `.optional()`.

## Adding Chainable Methods with `applyChain`

`applyChain()` wraps any validator and adds the method set (`.optional()`, `.default()`, `.describe()`, `.secret()`, `.validate()`):

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

## Adding Refinement Methods

To add methods like `.min()` on StringValidator, extend the wrapped validator:

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
        return singleError(errType(context.key, typeof input, "a semver string"))
      }
      const cleaned = input.startsWith("v") ? input.slice(1) : input
      const parts = cleaned.split(".").map(Number)
      if (parts.length !== 3 || parts.some(isNaN)) {
        return singleError(errInvalid(context.key, input, `"${input}" is not a valid semver`))
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
          return singleError(errInvalid(context.key, result.value, `Major version must be at least ${min}`))
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

This is the same pattern `StringValidator` and `NumberValidator` use internally.

## Writing a Refinement Function

If you don't need a full validator, write a refinement that wraps an existing one. This is what `url()`, `email()`, `min()`, `max()`, and `port()` do:

```typescript
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

Usage:

```typescript
const env = defineEnv({
  THEME_COLOR: hexColor()(string()).default("#3b82f6"),
})
```

## A Complete Example: IP Address Validator

```typescript
import {
  createValidator, applyChain, parseOk, singleError, errType, errInvalid,
} from "@ctroenv/core"

interface IpValidator extends Validator<string>, ChainableMethods<string> {
  v4(): IpValidator
  v6(): IpValidator
}

function ip(): IpValidator {
  const base = createValidator<string>(
    (input, context) => {
      if (typeof input !== "string") {
        return singleError(errType(context.key, typeof input, "an IP address"))
      }

      const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
      const match = input.match(ipv4)
      if (match) {
        const valid = match.slice(1).every((octet) => {
          const n = Number(octet); return n >= 0 && n <= 255
        })
        if (!valid) {
          return singleError(errInvalid(context.key, input, "IPv4 octets must be between 0 and 255"))
        }
        return parseOk(input)
      }

      if (input.includes(":")) {
        const parts = input.split(":")
        if (parts.length >= 2 && parts.length <= 8) return parseOk(input)
      }

      return singleError(errInvalid(context.key, input, `"${input}" is not a valid IP address`))
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
        if (result.value.includes(":")) {
          return singleError(errInvalid(context.key, result.value, "Expected IPv4 address, received IPv6"))
        }
        return result
      },
      original.metadata,
    )
    return applyChain(wrapped) as IpValidator
  }

  return extended
}

const env = defineEnv({
  TRUSTED_PROXY: ip().v4().describe("Trusted proxy IP (IPv4 only)"),
  DNS_SERVER: ip().optional().describe("Custom DNS server"),
})
```

## Error Factories

Available for building custom validators:

```typescript
import {
  errMissing,   // "Missing required environment variable: KEY"
  errType,      // "Expected a string, received number"
  errInvalid,   // "Invalid URL"
  errCoerce,    // 'Failed to coerce "foo" to number'
  errWrap,      // Generic wrapper for any ErrorCode
} from "@ctroenv/core"

errInvalid(context.key, value, "Custom error message", {
  suggestion: "Here's how to fix it.",
})
```

## Publishing Custom Validators

Publish as `@ctroenv/community-<name>`:

```json
{
  "name": "@ctroenv/community-ip",
  "version": "1.0.0",
  "type": "module",
  "dependencies": { "@ctroenv/core": "^1.0.0" }
}
```

```typescript
// src/index.ts
export { ip } from "./ip"
export type { IpValidator } from "./ip"
```

Only `@ctroenv/core` as a dependency. The same primitives that built the built-in validators.

| API | Purpose |
|-----|---------|
| `createValidator(parseFn, metadata)` | Create a base validator with custom parse logic |
| `applyChain(validator)` | Add `.optional()`, `.default()`, `.describe()`, `.secret()`, `.validate()` |
| `parseOk(value)` | Return a successful parse result |
| `singleError(error)` | Return a failed parse result |
| `errType`, `errInvalid`, etc. | Create typed `ValidationError` instances |
| Refinement functions | Wrap an existing validator with additional constraints |

The same primitives that built `string()`, `number()`, `boolean()`, and `pick()` are available to you. The only difference between a built-in validator and a community one is which npm package it lives in.

If you build something useful, open a PR or publish it under `@ctroenv/community-*`.

*Resources:* [Docs](https://ctroenv.vercel.app) · [GitHub](https://github.com/ctrotech-tutor/ctroenv) · [Contributing guide](https://github.com/ctrotech-tutor/ctroenv/blob/main/CONTRIBUTING.md)

*This was the final article in the series. Thanks for reading!*
