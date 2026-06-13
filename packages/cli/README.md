# @ctroenv/cli

[![npm version](https://img.shields.io/npm/v/@ctroenv/cli)](https://www.npmjs.com/package/@ctroenv/cli)
[![npm downloads](https://img.shields.io/npm/dw/@ctroenv/cli)](https://www.npmjs.com/package/@ctroenv/cli)
[![license](https://img.shields.io/npm/l/@ctroenv/cli)](https://github.com/ctrotech-tutor/ctroenv/blob/main/LICENSE)

CLI tooling for CtroEnv — validate, generate, check, and document environment variables.

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
|---|---|
| `validate` | Validate environment variables against your schema |
| `generate` | Generate `.env.example` from your schema |
| `check` | CI-friendly validation with exit codes |
| `docs` | Generate Markdown or JSON documentation from your schema |
| `init` | Scaffold a new CtroEnv project |

## Quick Start

```bash
# Validate current environment
ctroenv validate

# Generate .env.example
ctroenv generate

# CI-friendly check (exit code 1 on failure)
ctroenv check
```

## Configuration

Create `ctroenv.config.ts` in your project root:

```ts
import { defineConfig } from "@ctroenv/cli"

export default defineConfig({
  schema: "./src/env.ts",
  output: {
    example: ".env.example",
    docs: "ENV.md",
  },
})
```

## Programmatic API

```ts
import { defineConfig } from "@ctroenv/cli"

const config = defineConfig({
  schema: "./env.ts",
})
```

## Documentation

Full documentation at [ctroenv.vercel.app](https://ctroenv.vercel.app)

## License

MIT
