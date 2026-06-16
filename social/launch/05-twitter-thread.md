# Twitter / X — Announcement Thread

---

**Tweet 1:**
I'm excited to announce CtroEnv v1.0 🎉

A TypeScript-first environment variable management toolkit.
Zero dependencies. Beautiful errors. Built-in CLI.

→ https://github.com/ctrotech-tutor/ctroenv

[Image: Code screenshot showing defineEnv schema]

**Tweet 2:**
The core idea is simple:
Define your env schema once, and get:

• Type inference (no manual types)
• Runtime validation (fail fast with style)
• Auto-generated .env.example
• ENVIRONMENT.md docs
• CLI tooling

All from a single schema definition.

**Tweet 3:**
Zero. Runtime. Dependencies.

@ctroenv/core is 4 KB gzipped and has no imports other than TypeScript types.

Compare to alternatives that need Zod (50 KB+), Joi, or io-ts just to validate a few strings.

**Tweet 4:**
The validator API is chainable and self-documenting:

string().url().describe("DB connection")
number().port().default(3000)
pick(["dev", "staging", "prod"])

Every method is typed. Your IDE knows what's available.

**Tweet 5:**
Wait, there's a CLI too.

```bash
ctroenv validate    # Beautiful grouped errors
ctroenv generate    # .env.example from schema  
ctroenv check       # CI-friendly validation
ctroenv docs        # Auto-generate ENVIRONMENT.md
```

No more outdated .env.example files. No more "what env vars does this project need?"

**Tweet 6:**
Framework adapters included:

• @ctroenv/node → process.env
• @ctroenv/vite → import.meta.env
• @ctroenv/nextjs → Build-time + runtime validation

Type-safe from edge to database.

**Tweet 7:**
The package structure:

@ctroenv/core — 4 KB, zero deps
@ctroenv/cli — CLI with 5 commands
@ctroenv/node — Node adapter
@ctroenv/vite — Vite adapter
@ctroenv/nextjs — Next.js adapter
@ctroenv/shared — Internal shared utils

Use what you need. Nothing more.

**Tweet 8:**
Read the docs → https://ctroenv.vercel.app
Check the code → https://github.com/ctrotech-tutor/ctroenv
Install today → npm i @ctroenv/core

MIT licensed. PRs welcome. Feedback appreciated 🙏

#TypeScript #NodeJS #WebDev #OpenSource
