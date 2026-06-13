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

## API

| Function | Description |
|---|---|
| `ctroenvPlugin(opts)` | Vite plugin that validates env vars at build start |
| `viteSource()` | `EnvSource` reading from `import.meta.env` |

### Plugin Options

```ts
interface CtroEnvPluginOptions {
  schema: string | SchemaDefinition   // Schema path or inline definition
  failOnError?: boolean               // Fail build on error (default: true)
}
```

## Documentation

Full documentation at [ctroenv.vercel.app](https://ctroenv.vercel.app)

## License

MIT
