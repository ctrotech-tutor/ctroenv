# @ctroenv/vite

[![npm version](https://img.shields.io/npm/v/@ctroenv/vite)](https://www.npmjs.com/package/@ctroenv/vite)
[![npm downloads](https://img.shields.io/npm/dw/@ctroenv/vite)](https://www.npmjs.com/package/@ctroenv/vite)
[![license](https://img.shields.io/npm/l/@ctroenv/vite)](https://github.com/ctrotech-tutor/ctroenv/blob/main/LICENSE)

Vite adapter for CtroEnv — validate environment variables at build time.

## Installation

```bash
npm install @ctroenv/vite
```

## Usage

```ts
// vite.config.ts
import { defineConfig } from "vite"
import { ctroenvPlugin } from "@ctroenv/vite"

export default defineConfig({
  plugins: [
    ctroenvPlugin({
      schema: "./src/env.ts",
    }),
  ],
})
```

### With Inline Schema

```ts
ctroenvPlugin({
  schema: {
    API_URL: string().url(),
    PORT: number().port().default(3000),
  },
})
```

## API

| Function | Description |
|----------|-------------|
| `ctroenvPlugin(opts)` | Vite plugin that validates env vars at build start |
| `viteSource()` | `EnvSource` reading from `import.meta.env` (falls back to `process.env`) |

### Plugin Options

```ts
interface CtroEnvPluginOptions {
  schema: string | SchemaDefinition   // Schema file path or inline definition
  failOnError?: boolean               // Fail build on validation error (default: true)
  maskWith?: string                   // Custom mask string for secret values
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `schema` | `string \| SchemaDefinition` | — | Path to schema module or inline definition |
| `failOnError` | `boolean` | `true` | When `false`, validation failures become warnings |
| `maskWith` | `string` | `"********"` | Custom string for masking `.secret()` values |

### `viteSource`

```ts
viteSource(): EnvSource
```

Creates an `EnvSource` that reads from `import.meta.env` with fallback to `process.env` for non-Vite environments.

```ts
import { defineEnv } from "@ctroenv/core"
import { viteSource } from "@ctroenv/vite"

const env = defineEnv(schema, {
  source: viteSource(),
})
```

### Build Output

On successful validation:

```
✓ CtroEnv: All environment variables valid
```

On validation failure (with `failOnError: true`):

```
✗ CtroEnv: [formatted validation errors]
```

On validation failure (with `failOnError: false`):

```
✗ CtroEnv: [formatted validation errors] (build continues)
```

## Documentation

Full documentation at [ctroenv.vercel.app](https://ctroenv.vercel.app)

## License

MIT
