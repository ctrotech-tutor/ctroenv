# Phase 4 — Polish & Developer Experience

**Duration:** Week 7  
**Goal:** Refine every edge of the developer experience — error messages, documentation site, performance benchmarks, and migration paths.

---

## 4.1 Error Message Refinement

### Review & Refine Every Error Path

Every possible error message should be reviewed for:

1. **Clarity:** Can a junior developer understand it?
2. **Actionability:** Does it tell the user what to do next?
3. **Context:** Does it show the relevant schema/values?

**Error audit checklist:**
```
- Missing required variable        → Shows key, description, type
- Type mismatch (string vs number) → Shows received value + type hint
- Validation failure (invalid URL) → Shows invalid value + expected format
- Coercion failure                 → Shows original value + attempted coercion
- Unknown variable in CI check     → Shows where it came from
- Schema not found                 → Shows search paths tried
- Source not detected              → Shows available runtimes
```

### Error Message Style Guide

```
[icon] [brief title]
       [detail line 1]
       [detail line 2]
       [suggestion]
```

Example:
```
●  Missing required variable
   DATABASE_URL — PostgreSQL database connection URL
   Type: string
   → Add DATABASE_URL to your .env file
```

### User Testing
- Share CLI output with 3-5 developers unfamiliar with the project
- Collect feedback on error clarity
- Iterate based on feedback

---

## 4.2 Documentation Site

### Technology: Vitepress
- Fast, Vue-based static site generator
- Built-in search
- Versioned docs support
- Easy GitHub Pages deployment

### Site Structure

```
docs/
├── index.md              # Landing page
├── guide/
│   ├── getting-started.md # Quick start
│   ├── schema.md         # Schema API reference
│   ├── validators.md     # All validators & refinements
│   ├── cli.md            # CLI commands guide
│   ├── adapters.md       # Framework adapters
│   ├── config.md         # Configuration files
│   ├── migration/
│   │   ├── from-t3-env.md
│   │   ├── from-envalid.md
│   │   └── from-dotenv.md
│   └── best-practices.md
├── api/
│   ├── define-env.md
│   ├── validators.md
│   └── cli.md
├── examples/
│   ├── nextjs.md
│   ├── vite.md
│   ├── express.md
│   └── monorepo.md
└── .vitepress/
    └── config.ts
```

### CI/CD for Docs

```yaml
# .github/workflows/docs.yml
name: Deploy Docs
on:
  push:
    branches: [main]
    paths: ["docs/**"]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run docs:build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          publish_dir: docs/.vitepress/dist
```

---

## 4.3 Performance Benchmarks

Establish a baseline and track regressions:

### Benchmark Suite

```ts
// packages/core/src/__benchmarks__/validate.bench.ts
import { bench, run } from "mitata"

const schema = {
  DATABASE_URL: string().url(),
  PORT: number().default(3000),
  NODE_ENV: pick(["dev", "prod", "test"]),
  JWT_SECRET: string().min(32).secret(),
  DEBUG: boolean().optional(),
}

const validSource = {
  DATABASE_URL: "postgresql://localhost:5432/db",
  PORT: "3000",
  NODE_ENV: "dev",
  JWT_SECRET: "a".repeat(32),
}

bench("validate 5 fields", () => {
  defineEnv(schema, { source: validSource })
})

const invalidSource = { DATABASE_URL: "not-a-url", PORT: "abc" }

bench("validate 5 fields with 2 errors", () => {
  try {
    defineEnv(schema, { source: invalidSource })
  } catch {}
})

await run()
```

### Target Metrics

| Operation | Target | Notes |
|---|---|---|
| Validate 5 fields (pass) | < 0.1ms | Cold start friendly |
| Validate 5 fields (fail) | < 0.2ms | Includes error formatting |
| Validate 20 fields (pass) | < 0.3ms | Realistic large schema |
| Generate .env.example (10 vars) | < 5ms | File I/O excluded |
| Check .env vs schema (10 vars) | < 3ms | |

### CI Benchmark Gate

```yaml
# In CI: fail if performance degrades >20%
- run: npm run bench
- run: node scripts/check-benchmarks.js
```

---

## 4.4 Migration Guides

Detailed guides for users coming from other libraries:

### From t3-env
```md
# Migrating from @t3-oss/env

## Before (t3-env + Zod)
\`\`\`ts
import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
  },
  client: {
    NEXT_PUBLIC_API_URL: z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
})
\`\`\`

## After (CtroEnv)
\`\`\`ts
import { defineEnv } from "@ctroenv/nextjs"
import { string } from "@ctroenv/core"

export const env = defineEnv({
  server: {
    DATABASE_URL: string().url(),
  },
  client: {
    NEXT_PUBLIC_API_URL: string().url(),
  },
})
\`\`\`

## Key Differences
- No `runtimeEnv` duplication — CtroEnv auto-detects the source
- No Zod dependency — CtroEnv validators are built-in
- CLI commands available: \`npx ctroenv validate\`
```

### From envalid
```md
# Migrating from envalid

## Before
\`\`\`ts
import { cleanEnv, str, port } from "envalid"

const env = cleanEnv(process.env, {
  PORT: port({ default: 3000 }),
  DATABASE_URL: str(),
})
\`\`\`

## After
\`\`\`ts
import { defineEnv } from "@ctroenv/core"
import { string, number } from "@ctroenv/core"

const env = defineEnv({
  PORT: number().port().default(3000),
  DATABASE_URL: string().url(),
})
\`\`\`
```

### From dotenv
Simple: replace `dotenv.config()` with `defineEnv()`.

---

## 4.5 Bundle Size Optimization

### Track Bundle Size Per Package

| Package | Current Target | Maximum |
|---|---|---|
| `@ctroenv/core` | < 5KB gzipped | < 8KB |
| `@ctroenv/cli` | < 50KB gzipped | < 80KB |
| Adapters | < 2KB each | < 5KB |

### Bundle Analysis

```bash
# Add to CI
npx tsup --analyze
npx size-limit
```

### size-limit configuration

```jsonc
// packages/core/package.json
{
  "size-limit": [
    {
      "path": "dist/index.js",
      "limit": "5 KB"
    }
  ]
}
```

---

## 4.6 Acceptance Criteria

- [ ] All error messages reviewed and refined
- [ ] Documentation site deployed and searchable
- [ ] Migration guides for t3-env, envalid, dotenv
- [ ] Performance benchmarks established and met
- [ ] Bundle size within targets
- [ ] CI gates for performance and size
- [ ] "Getting Started" experience < 2 minutes
- [ ] Feedback collected from 5+ external developers

---

## 4.7 Out of Scope for Phase 4

- Secret management (Phase 5)
- ESLint plugin (Phase 5)
- VSCode extension (Phase 5)
- Enterprise features (Phase 5)
