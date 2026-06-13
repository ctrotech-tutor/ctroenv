# Hacker News Post

**Title:** CtroEnv — Type-safe environment variables for TypeScript, zero dependencies

**URL:** https://github.com/ctrotech-tutor/ctroenv

---

## Post (Show HN)

I got tired of managing environment variables with stringly-typed process.env accesses that blow up at runtime, so I built CtroEnv.

It's a TypeScript-first environment variable toolkit with zero runtime dependencies in the core package. You define a schema once, and it handles validation, type inference, documentation generation, and CLI tooling.

```typescript
import { defineEnv, string, number, pick } from "@ctroenv/core"

const env = defineEnv({
  DATABASE_URL: string().url(),
  PORT: number().port().default(3000),
  JWT_SECRET: string().secret(),
  NODE_ENV: pick(["dev", "staging", "prod"]),
})

// Fully inferred types — no assertions needed
env.DATABASE_URL  // string
env.PORT          // number
env.NODE_ENV      // "dev" | "staging" | "prod"
```

**Why not just use Zod/t3-env/envalid?**

- **Zero dependencies** — core package is dependency-free (Zod adds 50KB+)
- **Beautiful errors** — grouped by category with actionable suggestions, colored output, NO_COLOR support
- **CLI built-in** — validate, generate .env.example, check for missing variables, auto-generate docs
- **Framework adapters** — Node.js, Vite, and Next.js adapters included
- **6 packages** organized as a monorepo — use only what you need

The CLI is where this really shines for teams:

```bash
ctroenv validate    # Validates current .env against schema with beautiful errors
ctroenv generate    # Creates/updates .env.example from schema
ctroenv check       # Diffs .env vs schema — great for CI
ctroenv docs        # Generates ENVIRONMENT.md automatically
```

I'd love feedback on the API design, the error messages, and any features you think are missing. The project is MIT licensed.

**Links:**
- GitHub: https://github.com/ctrotech-tutor/ctroenv
- Docs: https://ctroenv.vercel.app
- npm: https://www.npmjs.com/org/ctroenv
