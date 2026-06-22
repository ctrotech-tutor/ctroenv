# @ctroenv/nextjs

[![npm version](https://img.shields.io/npm/v/@ctroenv/nextjs)](https://www.npmjs.com/package/@ctroenv/nextjs)
[![npm downloads](https://img.shields.io/npm/dw/@ctroenv/nextjs)](https://www.npmjs.com/package/@ctroenv/nextjs)
[![license](https://img.shields.io/npm/l/@ctroenv/nextjs)](https://github.com/ctrotech-tutor/ctroenv/blob/main/LICENSE)

Next.js adapter for CtroEnv — client/server env splitting with build-time validation.

## Installation

```bash
npm install @ctroenv/nextjs
```

## Usage

```ts
import { defineEnv, string, number, type NextSchemaDefinition } from "@ctroenv/nextjs"

const schema = {
  server: {
    DATABASE_URL: string().url(),
    JWT_SECRET: string().secret(),
  },
  client: {
    NEXT_PUBLIC_API_URL: string().url(),
  },
} satisfies NextSchemaDefinition

const env = defineEnv(schema)
```

### Build-time validation

```ts
// next.config.ts
import { withCtroEnv } from "@ctroenv/nextjs"
import type { NextConfig } from "next"

const schema = { server: { ... }, client: { ... } }

const nextConfig: NextConfig = {
  // your config
}

export default withCtroEnv(schema, nextConfig)
```

## API

| Function | Description |
|---|---|
| `defineEnv(schema)` | Returns proxied env object with server/client access control |
| `withCtroEnv(schema, config?)` | Next.js config wrapper with build-time validation |

### Secret values

Secret variables (`.secret()`) are masked to `"********"` on the env object. Access raw values via `env.meta.get("KEY")`.

```ts
env.JWT_SECRET          // "********"
env.meta.get("JWT_SECRET") // actual value
env.meta.keys()         // ["JWT_SECRET"]
env.meta.has("JWT_SECRET") // true
```

## Documentation

Full documentation at [ctroenv.vercel.app](https://ctroenv.vercel.app)

## License

MIT
