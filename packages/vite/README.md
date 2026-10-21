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
| `schema` | `string \| SchemaDefinition` | — | Path to schema module (resolved against Vite `root`) or inline definition |
| `failOnError` | `boolean` | `true` | When `false`, validation failures become warnings |
| `maskWith` | `string` | `"********"` | Custom string for masking `.secret()` values |

### Where validation reads values

The plugin validates against the same values your app will see, using Vite's own `.env` loader with your resolved `mode`, `envDir`, and `envPrefix`:

1. `.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local` (later files win; actual `VITE_*` process vars win over files — standard Vite precedence).
2. Full `process.env` fallback, so server-side and non-prefixed vars provided via the shell still validate.

Note that Vite never exposes non-prefixed file-only vars at runtime, so a schema entry that exists only as a non-prefixed `.env` line is correctly reported as missing — export it or prefix it with `VITE_`.

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

- **Success:** Logs `✓ CtroEnv: All environment variables valid`
- **Failure with `failOnError: true` (default):** Emits a build error with `✗ CtroEnv: ...` — stops the build
- **Failure with `failOnError: false`:** Emits a build warning with `✗ CtroEnv: ...` — build continues

## Documentation

Full documentation at [ctroenv.vercel.app](https://ctroenv.vercel.app)

## License

MIT
