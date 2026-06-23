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
|----------|-------------|
| `loadEnv(opts?)` | Load `.env` files and return an `EnvSource` |
| `nodeSource()` | Create an `EnvSource` from `process.env` |
| `parseEnvFile(content)` | Parse a `.env` file string into key-value pairs |

### `loadEnv`

```ts
loadEnv({ path?, encoding?, override?, system?, native? }): EnvSource
```

Reads `.env`, `.env.{NODE_ENV}`, and `.env.local` files in priority order. Returns an `EnvSource` compatible with `defineEnv()`.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | `string` | `process.cwd()` | Directory to search for `.env` files |
| `encoding` | `BufferEncoding` | `"utf-8"` | File encoding |
| `override` | `boolean` | `false` | Prefer file values over `process.env` |
| `system` | `boolean` | `false` | Fall back to `process.env` for missing keys |
| `native` | `boolean` | `false` | Use Node.js built-in `process.loadEnvFile()` when available (Node 21.7+) |

### `nodeSource`

```ts
nodeSource(): EnvSource
```

Simple `process.env` wrapper. Use when you don't need `.env` file loading.

### `parseEnvFile`

```ts
parseEnvFile(content: string): Record<string, string>
```

Parses a raw `.env` file string. Supports:

- Comments (`#`)
- `export KEY=val` prefix
- Quoted values (`"..."` and `'...'`)
- Inline comments: `KEY=val # comment`
- Multiline values with trailing `\`
- Variable interpolation: `KEY=$OTHER` and `KEY=${OTHER}`
- Escaped quotes: `KEY=it's` or `KEY=val\"ue`
- `$$` escaping for literal dollar signs

## Documentation

Full documentation at [ctroenv.vercel.app](https://ctroenv.vercel.app)

## License

MIT
