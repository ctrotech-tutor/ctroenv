# Phase 0 — Foundation & Project Setup

**Duration:** Week 1  
**Goal:** A production-ready monorepo with all tooling, CI, and GitHub configuration in place.

---

## 1.1 Repository Structure

```
ctroenv/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                  # Test + lint + build on PR/push
│   │   ├── release.yml             # npm publish via changesets
│   │   └── docs.yml                # Deploy docs site
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug-report.yml
│   │   ├── feature-request.yml
│   │   └── config.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── CODEOWNERS
│   └── dependabot.yml
├── packages/
│   ├── core/                       # @ctroenv/core
│   │   ├── src/
│   │   └── package.json
│   ├── cli/                        # @ctroenv/cli
│   │   ├── src/
│   │   └── package.json
│   ├── node/                       # @ctroenv/node
│   │   ├── src/
│   │   └── package.json
│   ├── vite/                       # @ctroenv/vite
│   │   ├── src/
│   │   └── package.json
│   └── nextjs/                     # @ctroenv/nextjs
│       ├── src/
│       └── package.json
├── plan/                           # Phase plans
├── examples/                       # Example projects per adapter
├── package.json                    # Root workspace config
├── tsconfig.json                   # Base TypeScript config
├── tsconfig.build.json             # Strict build config
├── biome.json                      # Linting + formatting
├── vitest.config.ts                # Test configuration
├── .gitignore
├── .npmrc
├── LICENSE
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── SECURITY.md
└── README.md
```

---

## 1.2 Root package.json

```jsonc
{
  "name": "ctroenv",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "tsc -b && tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "biome check .",
    "lint:fix": "biome check --apply .",
    "format": "biome format .",
    "typecheck": "tsc -b --noEmit",
    "changeset": "changeset",
    "release": "changeset publish",
    "clean": "rimraf packages/*/dist"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "tsup": "^8.4",
    "vitest": "^3.1",
    "biome": "^1.9",
    "rimraf": "^6.0",
    "@changesets/cli": "^2.28",
    "husky": "^9.1",
    "lint-staged": "^15.5"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["biome check --apply", "biome format"],
    "*.{json,md,yaml}": ["biome format"]
  }
}
```

---

## 1.3 TypeScript Configuration

### tsconfig.json (base)
```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### tsconfig.build.json
- Extends base
- Includes only `packages/*/src`
- Excludes `**/*.test.ts`, `**/*.spec.ts`

### Per-package tsconfig.json
Each package has its own `tsconfig.json` extending the root with appropriate `outDir` and `paths`.

---

## 1.4 Build Tooling — tsup

Each package gets a `tsup.config.ts`:

```ts
import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  minify: false,
  sourcemap: true,
  splitting: false,
})
```

**Key decision:** Core package uses `external: []` (no bundled deps). CLI package bundles everything for `npx` compatibility.

---

## 1.5 Testing — Vitest

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/*/src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**"],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
  },
})
```

---

## 1.6 Linting & Formatting — Biome

```jsonc
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noForEach": "off"
      },
      "style": {
        "noNonNullAssertion": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "semicolons": "asNeeded",
      "trailingCommas": "all"
    }
  }
}
```

---

## 1.7 Git Hooks — Husky + lint-staged

```bash
# .husky/pre-commit
npx lint-staged
```

```bash
# .husky/commit-msg
npx --no -- commitlint --edit $1
```

Conventional commits enforced via `@commitlint/config-conventional`:
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `chore:` maintenance
- `refactor:` code restructuring
- `test:` testing
- `ci:` CI/CD changes

---

## 1.8 GitHub Configuration

### CI Workflow (`.github/workflows/ci.yml`)
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

### Release Workflow (`.github/workflows/release.yml`)
```yaml
name: Release
on:
  push:
    branches: [main]
concurrency: ${{ github.workflow }}-${{ github.ref }}
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: Create Release PR or Publish
        uses: changesets/action@v1
        with:
          publish: npm run release
          version: npm run changeset version
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Dependabot (`.github/dependabot.yml`)
```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 10
```

### Issue Templates

- **Bug report:** Environment info, reproduction steps, expected vs actual behavior, schema snippet
- **Feature request:** Problem statement, proposed solution, alternatives considered

### PR Template
- Description of changes
- Related issue(s)
- Checklist: `[x]` tests, `[x]` docs, `[x]` changeset included

---

## 1.9 Publishing Strategy — npm

### Package Scopes & Names

| Package | npm Name | Version |
|---|---|---|
| Core | `@ctroenv/core` | Independent |
| CLI | `@ctroenv/cli` | Independent |
| Node | `@ctroenv/node` | Independent |
| Vite | `@ctroenv/vite` | Independent |
| Next.js | `@ctroenv/nextjs` | Independent |

### Per-package package.json fields (all packages)
```jsonc
{
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "engines": {
    "node": ">=18"
  },
  "publishConfig": {
    "access": "public",
    "provenance": false
  }
}
```

### Changesets Workflow
1. Developer runs `npx changeset` to describe changes
2. CI creates "Version Packages" PR
3. Merging PR triggers `changeset publish` to npm
4. GitHub Release created automatically

---

## 1.10 Gitignore

```
node_modules/
dist/
*.tsbuildinfo
.env
.env.local
coverage/
.turbo/
```

---

## 1.11 README.md (Initial Structure)

```md
# CtroEnv

**Define once. Trust everywhere.**

A TypeScript-first environment management toolkit.

## Quick Start

\`\`\`bash
npm install @ctroenv/core
\`\`\`

\`\`\`ts
import { defineEnv, string, number } from "@ctroenv/core"
const env = defineEnv({ ... })
\`\`\`

## Documentation

- [API Reference](link)
- [CLI Guide](link)
- [Migration Guides](link)

## Packages

| Package | Description |
|---|---|
| @ctroenv/core | Schema engine |
| @ctroenv/cli | Command-line tools |
| @ctroenv/node | Node.js adapter |
| @ctroenv/vite | Vite adapter |
| @ctroenv/nextjs | Next.js adapter |

## License

MIT
```

---

## 1.12 Verification Checklist

- [ ] `npm install` at root installs all workspace packages
- [ ] `npm run build` builds all packages to `dist/`
- [ ] `npm test` passes with coverage thresholds
- [ ] `npm run lint` passes with no errors
- [ ] `npm run typecheck` passes with strict mode
- [ ] CI workflow passes on PR
- [ ] Changesets can generate version PRs
- [ ] Git hooks run lint-staged on commit
- [ ] `npm pack` in each package produces correct output
