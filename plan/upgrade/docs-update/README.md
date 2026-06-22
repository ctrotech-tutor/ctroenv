# Documentation Site Update Plan

**Reference:** Phase 1 (`phase/01-bug-fixes`, `6067cf1`) + Phase 2 (`phase/02-client-server`, `4c88db0`)
**Target docs:** `apps/docs/content/docs/` (MDX files)
**Also affected:** `.opencode/skills/ctroenv/SKILL.md` (agent guide)

---

## Changes vs. Docs Coverage

| # | Code Change | Docs to Update |
|---|------------|---------------|
| 1 | `pick([])` throws `TypeError` | `docs/core/pick.mdx` — update `values` param table, add note about minimum |
| 2 | `boolean()` accepts `y`/`Y`/`n`/`N`/`t`/`T`/`f`/`F` | `docs/core/boolean.mdx` — add 8 new rows to accepted values table |
| 3 | `number()` rejects hex (`0xFF`), scientific (`1e2`), whitespace-only | `docs/core/number.mdx` — add rejected cases to accepted values table |
| 4 | Email regex changed to HTML5 spec | `docs/core/refinements.mdx` — add note about HTML5 standard |
| 5 | URL rejects protocol-less, rejects `file:` | `docs/core/refinements.mdx` — add protocol requirement note |
| 6 | `.default(v)` validates in dev mode | `docs/core/chainable.mdx` — add dev-mode validation paragraph to `.default()` section |
| 7 | `structuredClone(env)` documented limitation | `docs/core/define-env.mdx` — add "Known Limitations" section |
| 8 | Next.js proxy secret masking fix | `docs/nextjs.mdx` — add `meta.get()` access pattern for secrets |
| 9 | `ClientServerSchema` type in core | `docs/core/schema-composition.mdx` — add client/server schema section |
| 10 | `InferredClientServerEnv` type | `docs/core/schema-composition.mdx` — mention alongside `ClientServerSchema` |
| 11 | `NextSchemaDefinition` deprecated | `docs/nextjs.mdx` — update imports, show `ClientServerSchema` from core |
| — | Agent guide stale | `.opencode/skills/ctroenv/SKILL.md` — sync with Phase 1 + Phase 2 changes |
| — | `AGENTS.md` stale | `AGENTS.md` — already updated inline; verify |

---

## File-by-File Plan

### 1. `docs/core/pick.mdx` — Empty Array Error

**Location:** Line 19 (`values` param table)

**Current:** `readonly string[]` with no minimum
**Change:**
- Add a "Throws" note after the accepted values section: `pick()` throws `TypeError` if `values` is an empty array.
- Update the Param table description to say "Array of allowed string values (minimum 1)".

### 2. `docs/core/boolean.mdx` — y/n/t/f Short Forms

**Location:** Accepted Values table (lines 17-33)

**Add 8 new rows:**

| Input | Result | Notes |
|---|---|---|
| `"y"` | ✅ `true` | Case-insensitive |
| `"Y"` | ✅ `true` | Single char |
| `"n"` | ✅ `false` | Case-insensitive |
| `"N"` | ✅ `false` | Single char |
| `"t"` | ✅ `true` | Case-insensitive |
| `"T"` | ✅ `true` | Single char |
| `"f"` | ✅ `false` | Case-insensitive |
| `"F"` | ✅ `false` | Single char |

### 3. `docs/core/number.mdx` — Stricter Parsing

**Location:** Accepted Values table (lines 15-27)

**Add 3 new rows:**

| Input | Result | Notes |
|---|---|---|
| `" 42"` | ❌ Type error | Leading whitespace |
| `"42 "` | ❌ Type error | Trailing whitespace |
| `"0xFF"` | ❌ Type error | Hex notation |
| `"1e2"` | ❌ Type error | Scientific notation |

Also update the first paragraph to add: "Numbers must be plain decimal strings — hex (`0xFF`), scientific (`1e2`), and whitespace-padded strings are rejected."

### 4. `docs/core/refinements.mdx` — Email & URL Changes

**Email section** (lines 29-35):
- Add: "Uses the HTML5 email validation regex — accepts standard email formats, rejects obvious non-emails."

**URL section** (lines 15-27):
- Add: "Requires a protocol (`https://`, `http://`, etc.). Protocol-less strings and `file:` URLs are rejected."

### 5. `docs/core/chainable.mdx` — Default Validation

**Location:** `.default(value)` section (lines 47-61)

**After** the existing example code block, add a paragraph:
> "In development mode (`NODE_ENV="development"`), the default value is validated against any active refinements. If the default fails validation, a warning is emitted via `console.warn`. This catches mistakes like `string().url().default("not-a-url")` early."

### 6. `docs/core/define-env.mdx` — structuredClone Limitation

**Location:** After Return Value section (after line 80)

Add a new section:
> ### Known Limitations
>
> #### `structuredClone(env)`
>
> `structuredClone()` is not supported on the Proxy-wrapped env object — this is a V8/JavaScript engine limitation shared by all Proxy-based env libraries (e.g., envalid#177).
>
> Use `JSON.parse(JSON.stringify(env))` for serialization. Secrets are masked to `"********"` and the `meta` object is non-enumerable, so it is excluded from the output.

### 7. `docs/nextjs.mdx` — Secret Access Pattern

**Location:** After the client/server boundary explanation (around line 59)

Add a subsection:
> ### Accessing Secret Values
>
> Server-side secret variables (marked with `.secret()`) are masked in the env object — `env.JWT_SECRET` returns `"********"`. To access the actual value, use the `meta` API:
>
> ```ts
> env.meta.get("JWT_SECRET") // → actual secret value
> env.meta.keys()            // → ["JWT_SECRET", ...]
> env.meta.has("JWT_SECRET") // → true
> ```
>
> Client-side access to server-only secrets throws an error regardless of masking.

### 8. `.opencode/skills/ctroenv/SKILL.md` — Sync

Review the skill file against Phase 1 changes and update:
- `pick([])` empty array guard
- `boolean()` y/n/t/f additions
- `number()` stricter parsing
- chain order note is already correct

### 9. Root `README.md` — Review for Staleness

**Location:** `README.md` (188 lines)

The README is a high-level overview and doesn't document specific validator behavior, so it likely needs no changes from Phase 1. Review:
- Quick start examples still compile and run correctly
- Feature comparison table still accurate
- Any mention of CLI behavior still matches current code

### 10. `docs/core/schema-composition.mdx` — Client/Server Schema Types

**Location:** Add after monorepo pattern section (around line 60)

Add a new section:

> ### Client/Server Schema
>
> For framework adapters that split environment variables into client and server groups (Next.js, Vite), CtroEnv provides shared types:
>
> ```ts
> import { type ClientServerSchema, type InferredClientServerEnv } from "@ctroenv/core"
>
> type Schema = ClientServerSchema
> // { client: SchemaDefinition, server: SchemaDefinition }
>
> type Env = InferredClientServerEnv<Schema>
> // Merged type: { DATABASE_URL: string; NEXT_PUBLIC_API_URL: string }
> ```
>
> These types are used by framework adapters to define client/server boundaries. The adapters own visibility logic — core defines the shape.

### 11. `docs/nextjs.mdx` — Update Imports for Core Types

**Location:** Lines 21-34 (schema definition code blocks)

Update imports to show the new `ClientServerSchema` from core:

```ts
import { string, number, type ClientServerSchema } from "@ctroenv/core"
import { defineEnv } from "@ctroenv/nextjs"

const schema = {
  server: { ... },
  client: { ... },
} satisfies ClientServerSchema
```

Note that `NextSchemaDefinition` still works but is deprecated — import from `@ctroenv/core` for new code.

Also update the Type Inference section (line 102) to reference `ClientServerSchema` instead of `NextSchemaDefinition`.

### 12. `.opencode/skills/ctroenv/SKILL.md` — Sync Phase 2

Add `ClientServerSchema` and `InferredClientServerEnv` to the core API reference section.

### 13. (Optional) New Blog Post — v1.4.0

If desired, create `content/blog/v1-4-0.mdx` covering:
- `ClientServerSchema` promoted to core
- `NextSchemaDefinition` deprecated
- Architectural improvements (adapter ownership, deferred Vite mode)

---

## Effort Estimate

| File | Type | Effort |
|------|------|--------|
| `docs/core/pick.mdx` | Edit (small) | 5 min |
| `docs/core/boolean.mdx` | Edit (table rows) | 10 min |
| `docs/core/number.mdx` | Edit (table rows + paragraph) | 10 min |
| `docs/core/refinements.mdx` | Edit (2 notes) | 5 min |
| `docs/core/chainable.mdx` | Edit (paragraph add) | 5 min |
| `docs/core/define-env.mdx` | Edit (new section) | 10 min |
| `docs/core/schema-composition.mdx` | Edit (new section) | 10 min |
| `docs/nextjs.mdx` | Edit (imports + type references) | 15 min |
| `SKILL.md` | Review + edit | 15 min |
| `README.md` | Review (likely no changes) | 5 min |
| New blog post v1.3.0 | Write new MDX | 30 min |
| New blog post v1.4.0 | Write new MDX | 20 min |
| **Total** | | **~2.5 hours** |

---

## Verification

```bash
# Preview docs site locally
cd apps/docs && npm run dev

# Check all links work
# Check docs match actual code behavior (no drift)
# Verify examples in docs compile
```
