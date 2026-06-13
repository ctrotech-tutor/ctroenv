# @ctroenv/core

[![npm version](https://img.shields.io/npm/v/@ctroenv/core)](https://www.npmjs.com/package/@ctroenv/core)
[![npm downloads](https://img.shields.io/npm/dw/@ctroenv/core)](https://www.npmjs.com/package/@ctroenv/core)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@ctroenv/core)](https://bundlephobia.com/package/@ctroenv/core)
[![license](https://img.shields.io/npm/l/@ctroenv/core)](https://github.com/ctrotech-tutor/ctroenv/blob/main/LICENSE)

Define, validate, and infer types for environment variables. Zero runtime dependencies.

## Features

- **Zero dependencies** — core package has no runtime deps
- **Full TypeScript inference** — exact types inferred from your schema
- **Rich error messages** — grouped, with suggestions, colorized
- **Chainable API** — `string().url().min(1).optional()`
- **Framework adapters** — Node, Vite, Next.js (separate packages)
- **CLI tooling** — validate, generate, check, docs, init (separate package)
- **Secret masking** — mask sensitive values in logs and output

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

// TypeScript infers:
//   env.DATABASE_URL → string
//   env.PORT → number
//   env.NODE_ENV → "development" | "staging" | "production"
//   env.JWT_SECRET → string
```

## Validators

| Validator | Type | Refinements |
|---|---|---|
| `string()` | `string` | `.url()`, `.email()`, `.port()`, `.min()`, `.max()`, `.regex()` |
| `number()` | `number` | `.int()`, `.positive()`, `.port()`, `.min()`, `.max()` |
| `boolean()` | `boolean` | (chainable methods only) |
| `pick([...])` | union literal | (chainable methods only) |

## Chainable Methods

All validators support: `.optional()`, `.default(v)`, `.describe(text)`, `.secret()`, `.validate(fn)`

## API

| Function | Description |
|---|---|
| `defineEnv(schema, opts?)` | Validate and return typed env object |
| `string()` | String validator factory |
| `number()` | Number validator factory (coerces strings) |
| `boolean()` | Boolean validator factory (coerces true/false/1/0) |
| `pick(values)` | Enum validator from string list |
| `formatErrors(errors)` | Format validation errors for CLI output |
| `CtroEnvError` | Error class with all validation errors |

## Error Handling

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

## Documentation

Full documentation at [ctroenv.vercel.app](https://ctroenv.vercel.app)

## License

MIT
