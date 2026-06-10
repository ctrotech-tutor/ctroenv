# CtroEnv

**Define once. Trust everywhere.**

A TypeScript-first environment management toolkit that helps developers define,
validate, document, and manage environment variables across any JavaScript
project.

## The Four Pillars

| Pillar | Description |
|---|---|
| **Define** | Declare variables once in a type-safe schema |
| **Validate** | Fail-fast at startup with beautiful terminal errors |
| **Document** | Auto-generate docs, examples, and references |
| **Manage** | CLI commands, secret protection, env diffing |

## Packages

| Package | Description | Status |
|---|---|---|
| `@ctroenv/core` | Schema engine — define and validate env vars | Planned |
| `@ctroenv/cli` | CLI tooling — validate, generate, check, docs | Planned |
| `@ctroenv/node` | Node.js adapter — process.env source | Planned |
| `@ctroenv/vite` | Vite adapter — import.meta.env + build plugin | Planned |
| `@ctroenv/nextjs` | Next.js adapter — client/server split | Planned |

## Quick Start

```bash
npm install @ctroenv/core
```

```ts
import { defineEnv, string, number, pick } from "@ctroenv/core"

const env = defineEnv({
  DATABASE_URL: string().url().describe("PostgreSQL connection URL"),
  PORT: number().default(3000),
  NODE_ENV: pick(["development", "production", "test"]),
})
```

## Documentation

- [Getting Started](https://ctroenv.vercel.app/docs/getting-started)
- [API Reference](https://ctroenv.vercel.app/docs/api-reference)
- [CLI Guide](https://ctroenv.vercel.app/docs/cli)
- [Migration Guides](https://ctroenv.vercel.app/docs/migration)

## License

MIT © [Ctrotech](https://github.com/ctrotech-tutor)
