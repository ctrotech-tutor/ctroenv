# Reddit — r/typescript

**Title:** I built a zero-dependency TypeScript library for type-safe environment variables

---

Hey r/typescript 👋

I've been annoyed for a while by how teams manage environment variables. Everyone writes `process.env.X` everywhere, hoping it's set. Validation is bolted on separately with Zod or io-ts. Documentation is manual. CI checks are non-existent.

So I built CtroEnv — a TypeScript-first environment management toolkit.

**Core philosophy:** Define your schema once, get validation + type inference + CLI tooling + docs generation automatically.

```typescript
const env = defineEnv({
  DATABASE_URL: string().url(),
  PORT: number().port().default(3000),
  NODE_ENV: pick(["dev", "staging", "prod"]),
})
```

TypeScript infers everything. No `as string`, no conditional exports.

**What makes it different:**

1. **Zero-dependency core** — @ctroenv/core is completely dependency-free. No Zod, no io-ts, no anything.
2. **Built-in CLI** — `ctroenv validate` gives you beautiful error messages grouped by category (missing vs invalid) with color and suggestions. `ctroenv generate` creates .env.example from your schema. `ctroenv docs` generates ENVIRONMENT.md automatically.
3. **Framework adapters** — Plug into Node (process.env), Vite (import.meta.env), or Next.js with build-time validation.
4. **Chainable API** — `.url()`, `.port()`, `.min()`, `.max()`, `.default()`, `.secret()`, `.describe()`, `.email()` all work on the validators.

**Size comparison with alternatives:**

| Library | Core size (gzip) | Dependencies |
|---------|-----------------|--------------|
| CtroEnv core | ~4 KB | 0 |
| Zod | ~12 KB | 0 |
| t3-env | ~15 KB | Zod (50 KB+) |
| envalid | ~8 KB | 6 |

**The CLI is my favorite part:**

```bash
# Before deploy
ctroenv validate    # Fails with grouped, colored errors
ctroenv check       # Diffs .env vs schema — perfect for CI

# For onboarding
ctroenv generate    # Creates .env.example from schema
ctroenv docs        # Generates ENVIRONMENT.md
```

Would love feedback on the API, the error message design, or anything else. The whole thing is MIT on GitHub.

GitHub: https://github.com/ctrotech-tutor/ctroenv
Docs: https://ctroenv.vercel.app
