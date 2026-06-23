# @ctroenv/nextjs

[![npm version](https://img.shields.io/npm/v/@ctroenv/nextjs)](https://www.npmjs.com/package/@ctroenv/nextjs)
[![npm downloads](https://img.shields.io/npm/dw/@ctroenv/nextjs)](https://www.npmjs.com/package/@ctroenv/nextjs)
[![license](https://img.shields.io/npm/l/@ctroenv/nextjs)](https://github.com/ctrotech-tutor/ctroenv/blob/main/LICENSE)

Next.js adapter for CtroEnv — client/server env splitting with build-time validation and runtime access control.

## Installation

```bash
npm install @ctroenv/nextjs
```

## Usage

```ts
import { defineEnv, string } from "@ctroenv/nextjs"
import type { ClientServerSchema } from "@ctroenv/core"

const schema = {
  server: {
    DATABASE_URL: string().url(),
    JWT_SECRET: string().secret(),
  },
  client: {
    NEXT_PUBLIC_API_URL: string().url(),
  },
} satisfies ClientServerSchema

const env = defineEnv(schema)

// Server-side: all variables accessible
env.DATABASE_URL  // string
env.JWT_SECRET    // "********" (masked)
env.NEXT_PUBLIC_API_URL // string

// Client-side: server-only access throws
// env.DATABASE_URL → "Server-only environment variable..." error
```

### Build-Time Validation

```ts
// next.config.ts
import { withCtroEnv } from "@ctroenv/nextjs"
import type { NextConfig } from "next"

const schema = { server: { ... }, client: { ... } }

const nextConfig: NextConfig = { /* your config */ }

export default withCtroEnv(schema, nextConfig)
```

Validates all environment variables at build start and logs errors before Next.js compiles.

## API

| Function | Description |
|----------|-------------|
| `defineEnv(schema, opts?)` | Returns proxied env object with server/client access control |
| `withCtroEnv(schema, config?)` | Next.js config wrapper with build-time validation |

### `defineEnv`

```ts
defineEnv<T extends ClientServerSchema>(
  schema: T,
  opts?: { maskWith?: string },
): InferredClientServerEnv<T>
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maskWith` | `string` | `"********"` | Custom string for masking `.secret()` values |

### Proxy Behavior

The returned env object uses a `Proxy` to enforce access control at runtime:

- **Server side:** All keys from both `server` and `client` schemas are accessible.
- **Client side:** Only `client` keys are accessible. Accessing a `server` key throws an error with a message suggesting `NEXT_PUBLIC_` prefix.
- **Secret values:** Keys marked with `.secret()` are masked to `"********"` (or custom `maskWith`). Raw values are accessible via `env.meta.get("KEY")`.
- **`meta` object:** Non-enumerable property providing `.get()`, `.has()`, `.keys()`, and `.toJSON()`.

### Secret Values

```ts
env.JWT_SECRET            // "********"
env.meta.get("JWT_SECRET") // actual value
env.meta.keys()           // ["DATABASE_URL", "JWT_SECRET", ...]
env.meta.has("JWT_SECRET") // true
env.meta.toJSON()         // { DATABASE_URL: "...", JWT_SECRET: "...", ... }
```

## Types

```ts
import type { ClientServerSchema, InferredClientServerEnv } from "@ctroenv/core"
import type { InferredNextEnv } from "@ctroenv/nextjs"

// InferredNextEnv<T> is an alias for InferredClientServerEnv<T>

// Legacy type (deprecated — use ClientServerSchema instead):
import type { NextSchemaDefinition } from "@ctroenv/nextjs"
```

## Documentation

Full documentation at [ctroenv.vercel.app](https://ctroenv.vercel.app)

## License

MIT
