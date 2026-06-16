# Reddit — r/node

**Title:** CtroEnv — Manage environment variables like a proper adult in Node.js

---

r/node, I need your brutally honest feedback.

I built a tool for environment variable management in Node.js/TypeScript projects. Before you roast me for "yet another env library" — hear me out on what makes this different.

**The problem:** Most Node.js projects I've worked on have the same pattern — `process.env.DATABASE_URL` sprinkled everywhere, a half-baked validation check at startup, and a `.env.example` that's always out of date. Documentation? Nobody writes it.

**The approach:** Define your environment schema once with a clean chainable API. Get validation, type inference, CLI tooling, and auto-generated docs for free.

```typescript
const env = defineEnv({
  DATABASE_URL: string().url(),
  PORT: number().port().default(3000),
  JWT_SECRET: string().secret(),
})
```

**The CLI commands:**

```
$ ctroenv validate
● Missing required (2)
  DATABASE_URL → Add DATABASE_URL to your .env file
  JWT_SECRET   → Required — no default

$ ctroenv generate    # Creates .env.example from schema
$ ctroenv check       # Diffs .env vs schema for CI
$ ctroenv docs        # Generates ENVIRONMENT.md
```

**Why this exists when dotenv + joi/zod already work:**

- Zero-dependency core (dotenv alone doesn't validate, joi/zod add weight)
- Errors are grouped, colored, and include suggestions — not a wall of text
- CLI is built-in from day one (not an afterthought)
- Framework adapters for Node, Vite, and Next.js

I'd especially love feedback on the error message format and the CLI commands. What's missing? What would make you switch from your current setup?

GitHub: https://github.com/ctrotech-tutor/ctroenv
npm: https://www.npmjs.com/org/ctroenv
