# Phase 1 — Core Library: Schema Engine

**Duration:** Weeks 2-3  
**Goal:** A fully-functional schema engine with validators, type inference, and beautiful error reporting.

---

## 2.1 Architecture Overview

```
src/
├── index.ts                  # Public API exports
├── define-env.ts             # defineEnv() orchestrator
├── types/
│   ├── index.ts              # Re-exports
│   ├── schema.ts             # Schema type system
│   ├── validator.ts          # Validator interface
│   └── infer.ts              # Type inference from schema
├── validators/
│   ├── base.ts               # Base validator class/factory
│   ├── string.ts             # string() validator
│   ├── number.ts             # number() validator
│   ├── boolean.ts            # boolean() validator
│   ├── pick.ts               # pick() (enum) validator
│   └── refinements/
│       ├── url.ts            # .url() refinement
│       ├── email.ts          # .email() refinement
│       ├── port.ts           # .port() refinement
│       ├── min.ts            # .min() refinement
│       ├── max.ts            # .max() refinement
│       └── regex.ts          # .regex() refinement
├── errors/
│   ├── index.ts
│   ├── validation-error.ts   # Structured error type
│   └── formatter.ts          # Terminal output formatter
├── sources/
│   ├── index.ts
│   ├── process-env.ts        # process.env reader
│   └── types.ts              # Source interface
└── utils/
    ├── coerce.ts             # Type coercion (string → number, etc.)
    └── freeze.ts             # Immutable object creation
```

---

## 2.2 Core Type System

### Schema Definition Types

```ts
// packages/core/src/types/schema.ts

export interface SchemaDefinition {
  [key: string]: Validator<unknown>
}

export interface ValidatorOptions {
  description?: string
  optional?: boolean
  default?: unknown
  secret?: boolean
}
```

### Validator Interface

```ts
// packages/core/src/types/validator.ts

export interface Validator<T> {
  _type: T  // Brand type for inference
  parse(input: unknown, context: ParseContext): ParseResult<T>
  metadata: ValidatorMetadata
}

export interface ParseContext {
  key: string
  path: string[]
}

export interface ParseResult<T> {
  success: boolean
  value?: T
  errors: ValidationError[]
}

export interface ValidatorMetadata {
  description?: string
  optional: boolean
  hasDefault: boolean
  defaultValue?: unknown
  isSecret: boolean
  typeLabel: string  // "string", "number", etc. — for display
}
```

### Validation Error

```ts
// packages/core/src/errors/validation-error.ts

export class ValidationError {
  readonly key: string
  readonly message: string
  readonly code: ErrorCode
  readonly value?: unknown
  readonly suggestion?: string

  constructor(opts: {
    key: string
    message: string
    code: ErrorCode
    value?: unknown
    suggestion?: string
  })
}

export type ErrorCode =
  | "missing_required"
  | "type_mismatch"
  | "invalid_value"
  | "validation_failed"
  | "coercion_failed"
```

---

## 2.3 Validator Implementation Pattern

### Base Factory

```ts
// packages/core/src/validators/base.ts

export function createValidator<T>(
  parse: (input: unknown) => ParseResult<T>,
  metadata: Partial<ValidatorMetadata>,
): Validator<T> & ChainableMethods<T>
```

The `ChainableMethods` mixin provides:
- `.optional()` — Mark as not required
- `.default(val)` — Provide default value
- `.describe(text)` — Add human-readable description
- `.secret()` — Mark for masking
- `.validate(fn)` — Custom validation function

### Example: String Validator

```ts
// packages/core/src/validators/string.ts

export function string(opts?: ValidatorOptions): StringValidator {
  const base = createValidator<string>((input) => {
    if (typeof input !== "string") {
      return {
        success: false,
        errors: [new ValidationError({
          key: "",
          message: `Expected a string, received ${typeof input}`,
          code: "type_mismatch",
          value: input,
          suggestion: "Ensure the value is wrapped in quotes.",
        })],
      }
    }
    return { success: true, value: input, errors: [] }
  }, { typeLabel: "string", ...opts })

  return extendValidator(base, {
    url()     { /* parse with URL constructor */ },
    email()   { /* parse with email regex */ },
    port()    { /* parse as port number string */ },
    regex(pattern, message?) { /* regex match */ },
    min(len)  { /* min length check */ },
    max(len)  { /* max length check */ },
  })
}

export interface StringValidator extends Validator<string> {
  url(): StringValidator
  email(): StringValidator
  port(): StringValidator
  regex(pattern: RegExp, message?: string): StringValidator
  min(length: number): StringValidator
  max(length: number): StringValidator
}
```

### Number Validator

```ts
export function number(opts?: ValidatorOptions): NumberValidator {
  // Coerce from string ("3000" → 3000)
  // Validate isNaN, isFinite
  // Chainable: .min(), .max(), .int(), .positive(), .port()
}
```

### Boolean Validator

```ts
export function boolean(opts?: ValidatorOptions): BooleanValidator {
  // Coerce: "true"/"1"/true → true, "false"/"0"/false → false
  // Strict mode: only true/false
}
```

### Pick (Enum) Validator

```ts
export function pick<T extends readonly string[]>(
  values: T,
  opts?: ValidatorOptions,
): Validator<T[number]> {
  // Only allow values from the provided array
  // Suggestion: "Did you mean 'production' instead of 'prod'?"
}
```

---

## 2.4 defineEnv() — The Orchestrator

```ts
// packages/core/src/define-env.ts

export interface DefineEnvOptions {
  /** Custom environment source. Defaults to auto-detect. */
  source?: EnvSource | Record<string, string | undefined>
  /** Prefix to strip from keys (e.g., "NEXT_PUBLIC_") */
  prefix?: string
}

export interface EnvSource {
  get(key: string): string | undefined
}

export function defineEnv<T extends SchemaDefinition>(
  schema: T,
  opts?: DefineEnvOptions,
): InferredEnv<T>
```

**Internal flow:**

1. **Source resolution:** Determine where to read env vars from (auto-detect `process.env` or `import.meta.env`, or use custom source)
2. **Schema validation:** For each key in schema, call `validator.parse(source.get(key))`
3. **Error collection:** Collect ALL errors (not just first failure)
4. **Early exit:** If any errors are fatal (missing required, type mismatch), throw aggregated error
5. **Coercion + defaults:** Apply defaults for optional fields, coerce types
6. **Freeze:** Return deeply frozen, fully typed object

### Source Auto-Detection

```ts
export function detectSource(): EnvSource {
  if (typeof process !== "undefined" && process.env) {
    return { get: (key) => process.env[key] }
  }
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return { get: (key) => import.meta.env[key] }
  }
  throw new CtroEnvError(
    "No environment source detected. Pass `source` explicitly.",
    { code: "no_source" },
  )
}
```

---

## 2.5 Type Inference

```ts
// packages/core/src/types/infer.ts

export type InferredEnv<T extends SchemaDefinition> = {
  readonly [K in keyof T]: T[K] extends Validator<infer V>
    ? V
    : never
}
```

This is the magic that makes `env.DATABASE_URL` resolve to `string` without any manual type annotations.

**Advanced: Conditional types for defaults:**
- If `.optional()` and no `.default()` → `T | undefined`
- If `.default(val)` → `T` (always present)
- If `.optional().default(val)` → `T`

```ts
type InferredValue<V extends Validator<any>> =
  V extends Validator<infer T>
    ? V extends { metadata: { hasDefault: true } }
      ? T  // Always present
      : V extends { metadata: { optional: true } }
        ? T | undefined  // May be undefined
        : T  // Required, always present
    : never
```

---

## 2.6 Error Formatting (Terminal Output)

```ts
// packages/core/src/errors/formatter.ts

export function formatErrors(errors: ValidationError[]): string
```

**Output design:**

```
  CtroEnv — Validation Failed

  Missing (2):
    DATABASE_URL    PostgreSQL connection URL
    JWT_SECRET      Required — no default

  Invalid (1):
    PORT            Expected number, received "abc"
                    → Using default: 3000

  → Run `npx ctroenv generate` to create .env.example
  → Run `npx ctroenv docs` to view full reference
```

**Design tokens:**
- Colors: red for errors, yellow for warnings, cyan for hints
- Icons: `●` for missing, `✗` for invalid, `→` for suggestions
- Indentation: 2 spaces per level
- Line width: capped at 80 chars for terminal readability

Implementation uses a simple string builder (no chalk dependency in core):

```ts
function colorize(text: string, color: "red" | "yellow" | "cyan"): string {
  const codes = { red: 31, yellow: 33, cyan: 36 }
  return `\x1b[${codes[color]}m${text}\x1b[0m`
}
```

---

## 2.7 Error Aggregation

```ts
export class CtroEnvError extends Error {
  readonly errors: ValidationError[]
  readonly suggestions: string[]

  constructor(errors: ValidationError[]) {
    super(formatErrors(errors))
    this.errors = errors
    this.name = "CtroEnvError"
  }
}
```

The `defineEnv()` function never throws on the first error — it collects all errors and presents them at once. This is critical for DX: developers fix all issues in one pass, not one-at-a-time.

---

## 2.8 Testing Strategy

### Unit Tests (per validator)

```ts
// packages/core/src/validators/string.test.ts
describe("string()", () => {
  it("parses valid strings", () => { /* ... */ })
  it("rejects numbers", () => { /* ... */ })
  it("rejects undefined when required", () => { /* ... */ })

  describe(".url()", () => {
    it("accepts https://example.com", () => { /* ... */ })
    it("rejects not-a-url", () => { /* ... */ })
  })

  describe(".min()", () => {
    it("rejects strings shorter than min", () => { /* ... */ })
  })
})
```

### Integration Tests

```ts
// packages/core/src/define-env.test.ts
describe("defineEnv()", () => {
  it("returns typed object for valid env", () => { /* ... */ })
  it("collects all errors before throwing", () => { /* ... */ })
  it("applies defaults for missing optional vars", () => { /* ... */ })
  it("coerces string to number", () => { /* ... */ })
  it("freezes the returned object", () => { /* ... */ })
  it("works with custom source", () => { /* ... */ })
  it("auto-detects process.env", () => { /* ... */ })
})
```

### Property-Based Tests

```ts
// packages/core/src/validators/number.test.ts
import { describe, it } from "vitest"
import * as fc from "fast-check"

describe("number() (property-based)", () => {
  it("accepts all finite integers", () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        const result = number().parse(String(n), dummyContext)
        expect(result.success).toBe(true)
        expect(result.value).toBe(n)
      }),
    )
  })
})
```

### Snapshot Tests (Error Output)

```ts
it("matches error snapshot", () => {
  try {
    defineEnv({ PORT: number() }, { source: { get: () => "abc" } })
  } catch (e) {
    expect(e.message).toMatchSnapshot()
  }
})
```

---

## 2.9 Acceptance Criteria

- [ ] `string()`, `number()`, `boolean()`, `pick()` validators working
- [ ] `.optional()`, `.default()`, `.describe()`, `.secret()` chainable methods
- [ ] `.url()`, `.email()`, `.port()`, `.min()`, `.max()`, `.regex()` refinements
- [ ] `defineEnv()` returns fully typed, frozen object
- [ ] All errors collected before throwing (no fail-fast)
- [ ] Terminal error formatting with colors, icons, suggestions
- [ ] Auto-detection of `process.env` and `import.meta.env`
- [ ] Custom source support
- [ ] Type inference: `env.DATABASE_URL` is `string`, `env.PORT` is `number`
- [ ] Test coverage ≥ 90%
- [ ] `npm run build` produces CJS + ESM + types
- [ ] `npm pack` shows correct exports

---

## 2.10 Out of Scope for Phase 1

- CLI commands (Phase 2)
- Framework adapters (Phase 3)
- Secret masking in logs (Phase 2 — CLI concern)
- `.env.example` generation (Phase 2 — CLI concern)
- Environment diffing (Phase 2 — CLI concern)
- Integration with external secret managers (Phase 5)
