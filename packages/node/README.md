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

Reads `.env`, `.env.{NODE_ENV}`, and `.env.local` files — later files win. `NODE_ENV` is read when `loadEnv` runs and defaults to `"development"`. Returns an `EnvSource` compatible with `defineEnv()`.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `path` | `string` | `process.cwd()` | Directory holding `.env` files, or a single `.env` file |
| `encoding` | `BufferEncoding` | `"utf-8"` | File encoding (ignored with `native`) |
| `override` | `boolean` | `false` | Prefer file values over `process.env` (default: `process.env` wins, dotenv-style) |
| `system` | `boolean` | `false` | With `override`, fall back to `process.env` for keys missing from files (no effect on its own) |
| `native` | `boolean` | `false` | Load via Node's `process.loadEnvFile()` (Node 21.7+) instead of the built-in parser. Never overrides existing variables; `override`, `system`, and `encoding` do not apply. Warns and falls back to the built-in parser on failure |

### `nodeSource`

```ts
nodeSource(): EnvSource
```

Simple `process.env` wrapper. Use when you don't need `.env` file loading.

### `parseEnvFile`

```ts
parseEnvFile(content: string): Record<string, string>
```

Parses a raw `.env` file string. The grammar matches `dotenv`, so files behave identically whether they are read here, by the CLI, or by Vite:

- Keys must match `[\w.-]+`; anything else is skipped.
- Separators are `=` (surrounding spaces allowed) or `:` followed by whitespace. `KEY:val` (no space) and `KEY : val` do not parse.
- Full-line comments (`# ...`) and blank lines are skipped; `export KEY=val` prefixes are accepted.
- `#` starts a comment in **unquoted** values — even without a preceding space (`KEY=pass#123` parses as `pass`). Quote values that contain `#`: `SECRET="pass#123"`.
- Double-quoted values may span lines; `\n` and `\r` sequences expand.
- Single-quoted and backtick-quoted values are fully literal (no escape processing) and may span lines. Use double quotes when escapes are needed.

CtroEnv extensions beyond `dotenv`:

- Variable interpolation: `KEY=$OTHER` and `KEY=${OTHER}`, resolved from earlier file entries then `process.env`; `$$` escapes to a literal `$`.
- Trailing-`\` continuations join unquoted values across lines.
- `\"` inside double-quoted values unescapes to `"` (matching shell, Python, and Ruby dotenv; plain `dotenv` keeps the backslash).

## Documentation

Full documentation at [ctroenv.vercel.app](https://ctroenv.vercel.app)

## License

MIT
