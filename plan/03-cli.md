# Phase 2 — CLI Tooling

**Duration:** Weeks 4-5  
**Goal:** A full-featured CLI that validates, generates, checks, and documents environment variables from the schema.

---

## 3.1 Architecture

```
packages/cli/
├── src/
│   ├── index.ts              # Entry point, CLI router
│   ├── commands/
│   │   ├── validate.ts       # ctroenv validate
│   │   ├── generate.ts       # ctroenv generate
│   │   ├── check.ts          # ctroenv check
│   │   └── docs.ts           # ctroenv docs
│   ├── utils/
│   │   ├── config.ts         # Config file loader (ctroenv.json)
│   │   ├── find-schema.ts    # Locate schema files in project
│   │   ├── output.ts         # Terminal rendering (chalk-based)
│   │   └── spinner.ts        # Progress indicator
│   └── types.ts
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

### Dependencies

```jsonc
{
  "dependencies": {
    "@ctroenv/core": "workspace:*",
    "commander": "^13.1",
    "chalk": "^5.4",
    "chokidar": "^4.0"  // for watch mode
  },
  "bin": {
    "ctroenv": "./dist/index.js"
  }
}
```

**Why commander:** It's the industry standard for Node.js CLI tools — argument parsing, help text, subcommands, and error handling out of the box. Lighter than yargs, more capable than arg.

---

## 3.2 CLI Entry Point

```ts
#!/usr/bin/env node
import { Command } from "commander"
import { validateCommand } from "./commands/validate"
import { generateCommand } from "./commands/generate"
import { checkCommand } from "./commands/check"
import { docsCommand } from "./commands/docs"

const program = new Command()
  .name("ctroenv")
  .description("Environment variable management toolkit")
  .version(version)

program.addCommand(validateCommand)
program.addCommand(generateCommand)
program.addCommand(checkCommand)
program.addCommand(docsCommand)

program.parse()
```

---

## 3.3 Command: `ctroenv validate`

**Purpose:** Run schema validation against current environment and display results.

**Usage:**
```bash
ctroenv validate
ctroenv validate --source .env.local
ctroenv validate --strict    # Treat warnings as errors
ctroenv validate --watch     # Re-run on file changes
ctroenv validate --json      # Output JSON for CI
```

**Implementation flow:**

1. Find schema (auto-detect or config-specified path)
2. Import/load the schema module
3. Read environment source
4. Run `defineEnv()` in "report" mode (collect but don't throw)
5. Display results:

```
  ✓ CtroEnv — All variables valid

  DATABASE_URL    ·   valid
  PORT            ·   valid (default: 3000)
  NODE_ENV        ·   valid (development)
```

Or on failure:

```
  ✗ CtroEnv — 3 errors found

  Missing (2):
    DATABASE_URL    Required
    JWT_SECRET      Required

  Invalid (1):
    PORT           Expected number, received "abc"
```

**Exit codes:**
- `0`: All valid
- `1`: Validation errors
- `2`: Configuration error

---

## 3.4 Command: `ctroenv generate`

**Purpose:** Create or update `.env.example` from the schema definition.

**Usage:**
```bash
ctroenv generate                          # Default: .env.example
ctroenv generate --output .env.template   # Custom output
ctroenv generate --no-comments            # Minimal output
```

**Output:**
```env
# CtroEnv — Environment Variables
# Generated from schema. Edit the schema, not this file.

# DATABASE_URL — PostgreSQL connection URL
# Required: yes
# Type: string
# DATABASE_URL=

# PORT — Server port
# Required: no
# Type: number
# Default: 3000
PORT=3000

# NODE_ENV — Environment mode
# Required: no
# Type: "development" | "production" | "test"
# Default: development
NODE_ENV=development

# JWT_SECRET — JWT signing secret
# Required: yes
# Type: string
# (secret)
# JWT_SECRET=
```

**Implementation:**
1. Load schema
2. For each key in schema:
   - Write header comment with description
   - Write metadata (required, type, default)
   - If `.secret()`, write a warning comment instead of a default
   - Write the variable with its default value (or blank)
3. Preserve existing file header if updating

---

## 3.5 Command: `ctroenv check`

**Purpose:** Compare `.env` against `.env.example` or schema to find missing/unused variables.

**Usage:**
```bash
ctroenv check                                # Compare .env vs schema
ctroenv check --example .env.example         # Compare .env vs .env.example
ctroenv check --production .production.env   # Multi-file compare
ctroenv check --json                         # Machine-readable output
```

**Output:**
```
  CtroEnv — Environment Check

  Missing (2):
    DATABASE_URL    Defined in schema, missing from .env
    JWT_SECRET      Defined in schema, missing from .env

  Unused (1):
    OLD_API_KEY     Present in .env, not defined in schema

  Recommendations:
    → Run `ctroenv generate` to update .env.example
    → Remove OLD_API_KEY from .env if no longer needed
```

**Implementation:**
1. Load schema
2. Read `.env` file(s)
3. Compare keys:
   - Keys in schema but not in `.env` → **missing**
   - Keys in `.env` but not in schema → **unused**
   - Keys in both → **matched**
4. Display categorized results

---

## 3.6 Command: `ctroenv docs`

**Purpose:** Generate a markdown reference document for all environment variables.

**Usage:**
```bash
ctroenv docs                              # Default: ENVIRONMENT.md
ctroenv docs --output ENV-REFERENCE.md    # Custom output
ctroenv docs --format json                # JSON output for CI
```

**Output (markdown):**
```markdown
# Environment Variables Reference

*Generated by CtroEnv. Update schema, not this file.*

## DATABASE_URL

- **Type:** `string`
- **Required:** Yes
- **Description:** PostgreSQL database connection URL
- **Validation:** Must be a valid URL

## PORT

- **Type:** `number`
- **Required:** No
- **Default:** `3000`
- **Description:** Server port number
- **Validation:** Must be between 1024 and 65535

## NODE_ENV

- **Type:** `"development" | "production" | "test"`
- **Required:** No
- **Default:** `"development"`
- **Description:** Application environment mode
```

---

## 3.7 Configuration File

Users can create `ctroenv.json` or `ctroenv.config.ts` for persistent config:

```jsonc
// ctroenv.json
{
  "$schema": "https://ctroenv.dev/schemas/config.json",
  "schema": "./src/env.ts",
  "sources": {
    "default": ".env",
    "production": ".production.env"
  },
  "output": {
    "example": ".env.example",
    "docs": "ENVIRONMENT.md"
  },
  "secrets": {
    "mask": ["JWT_SECRET", "API_KEY"],
    "maskWith": "********"
  }
}
```

For TypeScript configs, use `ctroenv.config.ts`:
```ts
import { defineConfig } from "@ctroenv/cli"

export default defineConfig({
  schema: "./src/env.ts",
  sources: {
    default: ".env",
  },
})
```

### Config Resolution

1. `ctroenv.config.ts` (if exists)
2. `ctroenv.config.js`
3. `ctroenv.json`
4. `ctroenv` key in `package.json`
5. CLI flags override all of the above

---

## 3.8 Schema Auto-Discovery

The CLI searches for schema files in this order:

1. Config file `schema` field
2. `src/env.ts`
3. `src/env/index.ts`
4. `env.ts`
5. `env.config.ts`

**Dynamic import:** The CLI uses `import()` to load the schema at runtime. This requires the project to be ESM-compatible or have a ts-node/jiti loader.

```ts
async function loadSchema(path: string): Promise<SchemaDefinition> {
  // Try dynamic import
  try {
    const mod = await import(resolvePath(path))
    return mod.env || mod.default || mod
  } catch (e) {
    throw new CliError(`Could not load schema from ${path}`)
  }
}
```

For TypeScript support at runtime, recommend `jiti` or `tsx` as a peer dependency:

```bash
npx tsx node_modules/.bin/ctroenv validate
```

---

## 3.9 Terminal Output System

```ts
// packages/cli/src/utils/output.ts

export class Output {
  static header(text: string): string
  static success(text: string): string
  static error(text: string): string
  static warning(text: string): string
  static hint(text: string): string
  static key(text: string): string
  static divider(): string

  static section(title: string, lines: string[]): string
  static table(rows: [string, string][]): string
  static spinner(text: string): Spinner
}
```

**Styling guidelines:**
- Use `chalk` for colors (it's in CLI deps, not core)
- Max width: 80 characters
- Prefix each section with the CtroEnv logo/wordmark
- Use Unicode box-drawing characters where appropriate (`─`, `│`, `├`, `└`)
- Support `NO_COLOR` environment variable
- Support `--no-color` flag

---

## 3.10 Testing Strategy

### Unit Tests
- Each command's option parsing
- Config file loading and merging
- Schema auto-discovery logic
- Output formatting functions

### Integration Tests (Fixtures)
Create fixture projects:
```
packages/cli/test/fixtures/
├── basic/
│   ├── env.ts                 # Simple schema
│   ├── .env                   # Valid env
│   └── .env.example           # Expected output
├── with-secrets/
│   ├── env.ts                 # Schema with secret()
│   └── .env
└── invalid/
    ├── env.ts                 # Schema with errors
    └── .env                   # Invalid values
```

```ts
describe("validate command", () => {
  it("passes for valid env", async () => {
    const result = await runCli(["validate"], { cwd: "basic" })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("All variables valid")
  })

  it("fails for invalid env", async () => {
    const result = await runCli(["validate"], { cwd: "invalid" })
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain("3 errors found")
  })
})
```

---

## 3.11 Acceptance Criteria

- [ ] `ctroenv validate` runs and displays results
- [ ] `ctroenv validate --json` outputs JSON
- [ ] `ctroenv validate --watch` re-runs on file changes
- [ ] `ctroenv generate` creates `.env.example`
- [ ] `ctroenv generate` preserves secrets correctly
- [ ] `ctroenv check` finds missing and unused variables
- [ ] `ctroenv docs` generates markdown reference
- [ ] Config file loading (json + ts)
- [ ] Schema auto-discovery works
- [ ] `npx ctroenv` works without global install
- [ ] All commands produce correct exit codes
- [ ] `NO_COLOR` env var disables colors
- [ ] Integration tests pass for all commands

---

## 3.12 Out of Scope for Phase 2

- Framework adapters (Phase 3)
- Secret masking in application logs (Phase 5)
- Encrypted vault (Phase 5)
- Environment sync between machines (Phase 5)
- ESLint plugin (Phase 5)
- VSCode extension (Phase 5)
