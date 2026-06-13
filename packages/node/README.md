# @ctroenv/node

[![npm version](https://img.shields.io/npm/v/@ctroenv/node)](https://www.npmjs.com/package/@ctroenv/node)
[![npm downloads](https://img.shields.io/npm/dw/@ctroenv/node)](https://www.npmjs.com/package/@ctroenv/node)
[![license](https://img.shields.io/npm/l/@ctroenv/node)](https://github.com/ctrotech-tutor/ctroenv/blob/main/LICENSE)

Node.js adapter for CtroEnv — load `.env` files and access `process.env`.

## Installation

```bash
npm install @ctroenv/node
```

## Usage

```ts
import { defineEnv } from "@ctroenv/core"
import { loadEnv } from "@ctroenv/node"

const env = defineEnv(schema, {
  source: loadEnv(),
})
```

## API

| Function | Description |
|---|---|
| `loadEnv(opts?)` | Load `.env` files and return an `EnvSource` |
| `nodeSource()` | Create an `EnvSource` from `process.env` |

### loadEnv

```ts
loadEnv({ path?: string, override?: boolean, system?: boolean }): EnvSource
```

Reads `.env`, `.env.{NODE_ENV}`, and `.env.local` files in priority order.

### nodeSource

```ts
nodeSource(): EnvSource
```

Simple `process.env` wrapper.

## Documentation

Full documentation at [ctroenv.vercel.app](https://ctroenv.vercel.app)

## License

MIT
