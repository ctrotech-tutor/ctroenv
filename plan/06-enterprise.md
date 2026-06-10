# Phase 5 — Enterprise & Ecosystem

**Duration:** Week 8+  
**Goal:** Secret management, ESLint plugin, VSCode extension, encrypted vault, and long-term ecosystem vision.

---

## 5.1 Secret Protection & Masking

### Runtime Secret Masking

```ts
import { defineEnv, string } from "@ctroenv/core"

const env = defineEnv({
  JWT_SECRET: string().secret(),
  GEMINI_API_KEY: string().secret(),
  DATABASE_URL: string().url(),  // Not secret
})
```

When serialized or logged, secret values are masked:

```ts
console.log(env)
// {
//   JWT_SECRET: "********",
//   GEMINI_API_KEY: "********",
//   DATABASE_URL: "postgresql://localhost:5432/db",
// }

console.log(env.JWT_SECRET)
// "********"
// To get the actual value: env.meta.get("JWT_SECRET")
```

### Implementation Approach

```ts
// In core, extend the returned env object with a Proxy
export function createMaskedProxy<T extends Record<string, unknown>>(
  values: T,
  secretKeys: Set<string>,
): T {
  return new Proxy(values, {
    get(target, key) {
      if (secretKeys.has(key as string)) {
        return "********"
      }
      return Reflect.get(target, key)
    },
    ownKeys(target) {
      return Reflect.ownKeys(target)
    },
    getOwnPropertyDescriptor(target, key) {
      return Reflect.getOwnPropertyDescriptor(target, key)
    },
  })
}
```

### env.meta API

```ts
interface EnvMeta {
  /** Get raw (unmasked) value */
  get(key: string): string | undefined
  /** Check if a key exists */
  has(key: string): boolean
  /** Get all keys */
  keys(): string[]
  /** Get serializable state (secrets masked) */
  toJSON(): Record<string, string | undefined>
  /** Export for CI/CD (secrets masked) */
  export(): Record<string, string | undefined>
}

env.meta.get("JWT_SECRET")       // Raw value
env.meta.toJSON()                 // All values, secrets masked
```

---

## 5.2 ESLint Plugin

**Package:** `@ctroenv/eslint-plugin`

**Purpose:** Catch environment variable misuse at lint time.

### Rules

#### `no-process-env`
Prevents direct `process.env.X` access — forces use of validated env object.

```ts
// ❌ Bad
const db = process.env.DATABASE_URL

// ✅ Good
const db = env.DATABASE_URL
```

```jsonc
// .eslintrc
{
  "plugins": ["@ctroenv"],
  "rules": {
    "@ctroenv/no-process-env": "error"
  }
}
```

#### `no-unused-env`
Warns when a declared env variable is never used in the codebase.

#### `no-missing-env`
Flags references to env variables that aren't declared in the schema.

### Implementation

```ts
// packages/eslint-plugin/src/rules/no-process-env.ts
export const noProcessEnv: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow direct process.env access",
    },
    schema: [],
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.object.type === "MemberExpression" &&
          node.object.object.type === "Identifier" &&
          node.object.object.name === "process" &&
          node.object.property.name === "env"
        ) {
          context.report({
            node,
            message:
              "Use validated env object instead of process.env directly.",
          })
        }
      },
    }
  },
}
```

---

## 5.3 VSCode Extension

**Package:** `ctroenv-vscode`

**Purpose:** Provide IDE integration for schema management.

### Features

1. **Schema validation on save** — Highlight errors in `.env` files based on schema
2. **Autocomplete** for env variable names in `.env` files
3. **Hover tooltips** — Show description, type, and default from schema
4. **Go to definition** — Jump from `.env` variable to its schema definition
5. **Inline decorations** — Show status (valid/invalid/missing) next to each line
6. **Command palette** — Run `ctroenv: Validate`, `ctroenv: Generate .env.example`

### Tech Stack
- Language: TypeScript
- Framework: VS Code Extension API
- Bundler: esbuild (via `@vscode/vsce`)
- Activation: On workspace containing `ctroenv.json` or schema file

---

## 5.4 Encrypted Vault (Team Feature)

**Package:** `@ctroenv/vault`

**Purpose:** Securely share secrets across a team without committing them to git.

### Architecture

```
                   Encryption Layer
                      AES-256-GCM
                           │
               ┌───────────┴───────────┐
               │                       │
         ctroenv vault init      ctroenv vault push
               │                       │
               ▼                       ▼
         .ctroenv/                 .ctroenv/
         └── vault.enc            └── vault.enc
                                   (encrypted with
                                    team public key)
```

### Workflow

```bash
# Initialize vault
ctroenv vault init

# Add a secret
ctroenv vault set JWT_SECRET

# Push to team (encrypts with team key)
ctroenv vault push

# Pull from team
ctroenv vault pull
```

### Key Management
- Uses age encryption (or libsodium)
- Supports: GitHub Teams, GPG keys, password-based
- Integrates with existing secret managers:
  - Doppler
  - Infisical
  - AWS Secrets Manager
  - HashiCorp Vault

---

## 5.5 GitHub Actions Integration

**Package:** `ctroenv-action`

**Purpose:** Validate environment variables in CI/CD.

```yaml
# .github/workflows/env-check.yml
name: Environment Check
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ctroenv/validate-action@v1
        with:
          schema: ./src/env.ts
          env-file: .env.example
          fail-on: missing
```

### Action Output
- Annotations on PR for missing/invalid variables
- Comment with summary of changes
- Status check pass/fail

---

## 5.6 Monorepo Schema Sharing

**Problem:** In monorepos, multiple packages need different subsets of environment variables, but share some common ones.

**Solution:** Schema composition:

```ts
// packages/database/src/env.ts
import { defineSchema, string } from "@ctroenv/core"

export const dbSchema = defineSchema({
  DATABASE_URL: string().url(),
  DATABASE_POOL_SIZE: number().default(10),
})

// apps/api/src/env.ts
import { extendSchema } from "@ctroenv/core"
import { dbSchema } from "packages/database/src/env"

export const apiSchema = extendSchema(dbSchema, {
  PORT: number().default(3000),
  JWT_SECRET: string().secret(),
})
```

### Implementation

```ts
export function defineSchema<T extends SchemaDefinition>(
  schema: T,
): Schema<T>

export function extendSchema<T extends SchemaDefinition, U extends SchemaDefinition>(
  base: Schema<T>,
  extension: U,
): Schema<T & U>
```

---

## 5.7 Ecosystem: The Ctro Family

This is the long-term vision — a family of tools built on the same philosophy:

```
CtroEnv     → Environment management
CtroValidate → General validation (form inputs, API payloads)
CtroFetch   → Type-safe HTTP client
CtroConfig  → Application configuration (YAML, JSON, env)
```

Each follows the same API patterns:
- Chainable `.method()` syntax
- TypeScript-native inference
- Beautiful error messages
- Zero-dependency core

---

## 5.8 Adoption & Community Strategy

### Launch Checklist
- [ ] Hacker News post
- [ ] Reddit (r/typescript, r/node, r/webdev)
- [ ] Twitter/X announcement thread
- [ ] Dev.to article series
- [ ] Product Hunt launch
- [ ] Website with live playground

### Community Building
- GitHub Discussions for Q&A
- Discord server for real-time help
- Weekly office hours (live stream)
- "Env of the Week" blog series (showcase community schemas)

### Open Source Governance
- CODEOWNERS for maintainer review
- Contributor ladder: Contributor → Maintainer → Core Team
- RFC process for major changes
- Quarterly roadmap voting

---

## 5.9 Acceptance Criteria

- [ ] Secret masking works in runtime env object
- [ ] `env.meta` API exposes raw values when needed
- [ ] ESLint plugin with 3+ rules
- [ ] VSCode extension with validation + autocomplete
- [ ] Encrypted vault for team secret sharing
- [ ] GitHub Action for CI validation
- [ ] Monorepo schema composition works
- [ ] 100+ GitHub stars
- [ ] 1,000+ npm downloads/week
- [ ] 5+ external contributors

---

## 5.10 The Big Picture

```
Today                         6 months                      12 months
────────                      ─────────                     ─────────
CtroEnv v1                    CtroEnv v2                    CtroEnv Ecosystem
├── Core validators           ├── Secret vault              ├── CtroValidate
├── CLI tools                 ├── ESLint plugin             ├── CtroFetch
├── Node adapter              ├── VSCode extension          ├── CtroConfig
├── Vite adapter              ├── GitHub Action             └── Community plugins
├── Next.js adapter           ├── Monorepo composition
└── Beautiful errors          └── 10 framework adapters
```

Each phase builds on the last. By v2, CtroEnv is not just a library — it's the standard way JavaScript teams manage environment variables.
