# Product Hunt Launch Page

**Product Name:** CtroEnv

**Tagline:** Type-safe environment variables for TypeScript — zero dependencies, beautiful errors, built-in CLI

**Description:**

CtroEnv is a TypeScript-first toolkit that lets you define, validate, and manage environment variables with zero runtime dependencies.

Stop using raw process.env sprinkled across your codebase. Define your schema once, and CtroEnv gives you full type inference, fail-fast validation with actionable error messages, CLI tooling, auto-generated documentation, and framework adapters for Node.js, Vite, and Next.js.

**Key Features:**

✓ **Zero-dependency core** — @ctroenv/core is 4 KB gzipped with no runtime imports
✓ **Full TypeScript inference** — No manual type annotations needed
✓ **Beautiful error messages** — Grouped by category (missing vs invalid) with colored output and fix suggestions
✓ **Built-in CLI** — `validate`, `generate`, `check`, `docs` commands from day one
✓ **Framework adapters** — Node.js (process.env), Vite (import.meta.env), Next.js (build-time + runtime)
✓ **Chainable API** — `.url()`, `.port()`, `.secret()`, `.default()`, `.min()`, `.max()`, `.email()`, `.describe()` and more
✓ **Auto-documentation** — One CLI command generates ENVIRONMENT.md from your schema
✓ **MIT licensed** — Free and open source

**Pricing:** Free (MIT License)

**Website:** https://ctroenv.vercel.app

**GitHub:** https://github.com/ctrotech-tutor/ctroenv

**Topics:** TypeScript, Node.js, Developer Tools, Open Source, CLI

**Product Hunt First Comment:**

Hey Hunters! 👋

I built CtroEnv because I was tired of three things:

1. `process.env.X` everywhere with no type safety
2. Outdated `.env.example` files that don't match the actual schema
3. Error messages that just say "something went wrong"

The idea is simple: define your environment schema once, and CtroEnv handles validation, types, documentation, and CLI tooling automatically.

The core package has zero dependencies — it's just TypeScript. The CLI can validate your current .env, generate .env.example from your schema, and even auto-write ENVIRONMENT.md for your README.

What's your env variable workflow look like? I'm especially curious about teams using monorepos — the schema composition feature in v1.1.0 came directly from our own pain managing shared vars across packages.

Roadmap covers ESLint plugin, VSCode extension, and secret vault integrations over on the repo.

**First image:** Screenshot of beautiful error output showing grouped missing/invalid variables
**Second image:** Code example showing defineEnv schema
**Third image:** CLI help output showing available commands
**Fourth image:** Docs site screenshot
