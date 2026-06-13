# Reddit — r/webdev

**Title:** I made a TypeScript library that makes environment variables stop being a pain

---

We've all been there. You clone a project, copy `.env.example`, spend 20 minutes tracking down what each variable means, and pray you didn't miss one before it blows up at 2 AM.

I built CtroEnv to solve this. It's a TypeScript library that lets you define your environment variables in a schema, then automatically validates them at startup, generates type definitions, creates documentation, and gives you a CLI to check everything.

```typescript
// Define once
const env = defineEnv({
  DATABASE_URL: string().url().describe("PostgreSQL connection string"),
  PORT: number().port().default(3000),
  JWT_SECRET: string().secret(),
})

// Use everywhere with full type safety
app.listen(env.PORT) // number — TypeScript knows this
```

**What you get:**

- ✅ **Validation** — Startup fails fast with beautiful error messages
- ✅ **TypeScript types** — Zero manual type annotations needed
- ✅ **CLI** — Validate, generate .env.example, check for missing vars, auto-write docs
- ✅ **Zero dependencies** — Core package is 4 KB gzipped, nothing else required
- ✅ **Framework support** — Node.js, Vite, Next.js adapters ready to go
- ✅ **Auto-docs** — One command generates ENVIRONMENT.md from your schema

This is MIT licensed and free. Check it out if you're tired of env var headaches.

GitHub: https://github.com/ctrotech-tutor/ctroenv
Docs site: https://ctroenv.vercel.app
