# @ctroenv/cli

[![npm version](https://img.shields.io/npm/v/@ctroenv/cli)](https://www.npmjs.com/package/@ctroenv/cli)
[![npm downloads](https://img.shields.io/npm/dw/@ctroenv/cli)](https://www.npmjs.com/package/@ctroenv/cli)
[![license](https://img.shields.io/npm/l/@ctroenv/cli)](https://github.com/ctrotech-tutor/ctroenv/blob/main/LICENSE)

CLI tooling for CtroEnv — validate, generate, check, document, and scaffold environment variables.

## Installation

```bash
npm install @ctroenv/cli
```

Or use directly with npx:

```bash
npx @ctroenv/cli validate
```

## Commands

| Command | Description |
|---------|-------------|
| `validate` | Validate environment variables against your schema |
| `generate` | Generate `.env.example` from your schema |
| `check` | CI-friendly diff of .env vs schema (exit code 1 on issues) |
| `docs` | Generate Markdown or JSON documentation from your schema |
| `init` | Scaffold a `ctroenv.config` file |

### `validate`

Validate current environment against schema.

```
ctroenv validate [--source <path>] [--watch] [--json]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--source <path>` | Config `sources.default` or `process.env` | Path to `.env` file |
| `--watch` | `false` | Watch files and re-validate on change |
| `--json` | `false` | Output JSON instead of formatted text |

### `generate`

Generate `.env.example` from schema.

```
ctroenv generate [--output <path>] [--no-comments]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--output <path>` | `".env.example"` | Output file path |
| `--no-comments` | `false` | Minimal output without comments |

### `check`

CI-friendly diff of .env vs schema.

```
ctroenv check [--source <path>] [--strict] [--warn-unknown] [--json]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--source <path>` | Config `sources.default` or `".env"` | Path to `.env` file |
| `--strict` | `false` | Also validate values against schema |
| `--warn-unknown` | `false` | Warn about keys in source not in schema (with "did you mean?" suggestions) |
| `--json` | `false` | Output JSON instead of formatted text |

Exit code `0` on success, `1` on missing/unused keys or validation errors.

### `docs`

Generate documentation from schema.

```
ctroenv docs [--output <path>] [--format <format>]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--output <path>` | `"ENVIRONMENT.md"` | Output file path |
| `--format <format>` | `"markdown"` | Output format: `markdown` or `json` |

### `init`

Scaffold a configuration file.

```
ctroenv init [--ts | --js | --json] [--minimal] [--from-env <path>]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--ts` | Default format | Generate TypeScript config |
| `--js` | — | Generate JavaScript config |
| `--json` | — | Generate JSON config |
| `--minimal` | `false` | Generate minimal config (schema path only) |
| `--from-env <path>` | — | Generate schema stub from existing `.env` file |

## Configuration

Create `ctroenv.config.ts` in your project root:

```ts
import { defineConfig } from "@ctroenv/cli"

export default defineConfig({
  schema: "./src/env.ts",
  sources: {
    default: ".env",
    production: ".production.env",
  },
  output: {
    example: ".env.example",
    docs: "ENVIRONMENT.md",
  },
  secrets: {
    mask: ["EXTRA_KEY"],
    maskWith: "***",
  },
})
```

### Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `schema` | `string` | `"src/env.ts"` | Path to schema file |
| `sources.default` | `string` | `".env"` | Default env file path |
| `sources.production` | `string` | — | Production env file path |
| `output.example` | `string` | `".env.example"` | Output path for `generate` |
| `output.docs` | `string` | `"ENVIRONMENT.md"` | Output path for `docs` |
| `secrets.mask` | `string[]` | `[]` | Additional keys to mask |
| `secrets.maskWith` | `string` | `"***"` | Mask string override |

Types:

```ts
import { defineConfig } from "@ctroenv/cli"
import type { CliConfig, Format, ResolvedConfig } from "@ctroenv/cli"

const config: CliConfig = defineConfig({ schema: "./env.ts" })
```

## Documentation

Full documentation at [ctroenv.vercel.app](https://ctroenv.vercel.app)

## License

MIT
