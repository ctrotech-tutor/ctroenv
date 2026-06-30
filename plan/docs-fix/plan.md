# Docs Fix Plan — v1.9.0 Post-Audit

> Generated after deep codebase audit against all 6 packages.
> Source-verified at commit-ish: current `main` (v1.9.0 published).

---

## Summary

| Category | Count | Files |
|----------|-------|-------|
| Existing docs to fix | 8 | pick, boolean, number, refinements, chainable, define-env, schema-composition, nextjs |
| CLI docs to fix | 2 | cli/validate, cli/check |
| New page to create | 1 | core/security |
| Config/infra to sync | 2 | AGENTS.md, .opencode/skills/ctroenv/SKILL.md |
| **Total** | **13** | |

---

## Second Review — Additional Findings

After a second deep pass against tests and edge cases:

### All tests confirm: No hidden behaviors

Every claim in the audit was validated against actual test files. No additional undocumented behaviors were found beyond the original audit.

### Edge case discovered: `originalValue` not forwarded through `walkSchema`

**Source truth** (`validate.ts:56-68`): When `walkSchema` creates `errWrap` for errors, it does NOT forward `originalValue` from the original validation error. So `ValidationError.originalValue` is always `undefined` when errors come through `defineEnv()`, even for non-secret vars.

**Security impact:** This means `originalValue` is effectively absent from all runtime errors. For the security docs page, we should note this: "The `originalValue` field exists on the type but is not populated by `defineEnv()`. It is available when creating errors directly via `errInvalid`, `errType`, or `errWrap`."

### Schema default path: `src/env.ts` vs `./src/env.ts`

**Source truth** (`config.ts:15`): `schema: "src/env.ts"` (no `./` prefix)
**Init template** (`init.ts:15`): `schema: "./src/env.ts"` (with `./`)
**Current docs** (`cli/configuration.mdx:74`): `"./src/env.ts"` (matches init template)

Both resolve to the same path. No change needed — just note in the plan that the code default omits `./` but `init` adds it.

### CLI check JSON output: full structure verified

**Source truth** (`check.ts:105-120`):
```json
{
  "source": ".env",
  "total": 5,
  "clean": false,
  "summary": { "missing": 2, "unused": 1, "matched": 2 },
  "found": 2,
  "missing": ["DATABASE_URL", "PORT"],
  "unused": ["OLD_KEY"],
  "matched": ["NODE_ENV", "HOST"],
  "validationErrors": null | [...],
  "unknownSuggestions": [{"key": "DATABSE_URL", "suggestion": "DATABASE_URL"}]
}
```

### CLI validate JSON output: full structure verified

**Source truth** (`validate.ts:106-114`):
```json
{
  "version": "1.2.2",
  "valid": true,
  "source": "process.env",
  "total": 5,
  "errors": 0,
  "variables": [
    {
      "key": "DATABASE_URL",
      "type": "string",
      "value": "postgres://...",
      "required": true,
      "description": "Primary database connection",
      "isSecret": false,
      "hasDefault": false,
      "defaultValue": null
    }
  ],
  "timestamp": "2026-06-25T..."
}
```

---

## Final Package-by-Package Findings

### 1. @ctroenv/shared — ✅ No issues

Exports verified: `createLogger`, `Logger`, `LoggerOptions`, `LogLevel`.
Internal: `colorize`, `formatLevel`, `formatPrefix` are NOT exported — no doc changes needed.

---

### 2. @ctroenv/core — 7 gaps

#### C1: `core/pick.mdx` — Empty array throws TypeError

**Source truth** (`pick.ts:13-15`):
```ts
if (values.length === 0) {
  throw new TypeError("pick() requires at least one allowed value")
}
```

**Current docs:** No mention of this behavior. User could try `pick([])` and get an unexpected TypeError.

**Fix:** Add "Throws TypeError if values is empty" to the values param table. Add note under "Accepted Values".

---

#### C2: `core/boolean.mdx` — Missing y/n/t/f short forms

**Source truth** (`boolean.ts:24-25`):
```ts
lower === "y" || lower === "t"  // truthy
lower === "n" || lower === "f"  // falsy
```

**Current docs table:** Only has `true`, `false`, `"true"`, `"false"`, `"TRUE"`, `"1"`, `"0"`, `"yes"`, `"no"`, `"on"`, `"off"`, `1`, `0`. Missing `y`, `t`, `n`, `f` (case-insensitive).

**Fix:** Add 8 rows: `"y"`, `"Y"`, `"n"`, `"N"`, `"t"`, `"T"`, `"f"`, `"F"`.

---

#### C3: `core/number.mdx` — Stricter parsing not documented

**Source truth** (`number.ts:25`):
```ts
if (!/^[+-]?\d+(\.\d+)?$/.test(trimmed)) {
  // Rejects: "0xFF", "1e2", "  ", " 42", "42 "
}
```

**Current docs table:** Only shows `""`, `"abc"`, `NaN`, `Infinity`, `true`, `null` as rejected.

**Missing rejection cases:**
- `" 42"` (leading whitespace) → type error
- `"42 "` (trailing whitespace) → type error
- `"  "` (whitespace-only) → type error
- `"0xFF"` (hex notation) → type error
- `"1e2"` (scientific notation) → type error

**Fix:** Add 5 rows to accepted-values table + paragraph clarifying "plain decimal strings only".

---

#### C4: `core/refinements.mdx` — Email regex changed, URL protocol check

**Source truth** (`string.ts:78-80`):
```ts
const re =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
```

**Current docs** (line 55): `Uses the regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/` — this is the OLD regex. The source now uses the HTML5 regex.

**Source truth** (`string.ts:68-69`):
```ts
if (!parsed.protocol || parsed.protocol === "file:") return "Invalid URL"
```

**Current docs:** No mention that URL rejects protocol-less strings or `file:` URLs.

**Email section fix:** Update regex to match source. Add "Uses the HTML5 email validation regex."

**URL section fix:** Add "Requires a protocol (`https://`, `http://`, etc.). Protocol-less strings and `file:` URLs are rejected."

**Also:** Add `hostname` to the list of standalone refinements in the refinements page. Wait — is `hostname` a standalone refinement? Let me check...

Actually, looking at `refinements/index.ts` and the core `index.ts`:
```
export { email, integer, max, min, port, regex, url } from "./validators/refinements"
```

No `hostname` export there. And `hostname` is only on the string validator. So it's NOT a standalone refinement — only a method on StringValidator. The refinements page correctly doesn't include it.

**Update:** The refinements.mdx document lists standalone refinements. `hostname()` is not one — it's only a method on `StringValidator`. No change needed for hostname in refinements.mdx.

---

#### C5: `core/chainable.mdx` — Dev-mode default validation

**Source truth** (`chain.ts:35-45`):
```ts
default(value: T) {
  if (process.env.NODE_ENV === "development") {
    const result = validator.parse(value as unknown as string, { key: ".default()", path: [] })
    if (!result.success) {
      console.warn(
        `[ctroenv] Default value "${String(value)}" fails validation: ${result.errors[0]?.message ?? "unknown error"}`,
      )
    }
  }
  // ... existing logic
}
```

**Current docs:** No mention of dev-mode validation in `.default()` section.

**Fix:** After the `.default()` examples, add: "In development mode (`NODE_ENV="development"`), the default value is validated against any active refinements. If it fails, `console.warn` emits a warning."

---

#### C6: `core/define-env.mdx` — 3 missing sections

**a) structuredClone limitation**

**Source truth** (`define-env/index.ts:81-83`):
```ts
if (key === Symbol.for("nodejs.util.inspect.custom")) {
```

The Proxy implements custom inspect but `structuredClone` cannot be fixed — it's a V8-level limitation on Proxy objects.

**Fix:** Add "Known Limitations" section explaining `structuredClone(env)` throws `DataCloneError`, with workaround `JSON.parse(JSON.stringify(env))`.

**b) Deno/Bun auto-detection**

**Source truth** (`source.ts:32-46`):
```ts
function tryDenoEnv(): EnvSource | undefined { ... }
function tryBunEnv(): EnvSource | undefined { ... }
```

Detection order: `import.meta.env` → `Deno.env` → `Bun.env` → `process.env`.

**Current docs:** Only mentions `import.meta.env` and `process.env` in the auto-detection paragraph.

**Fix:** Add runtime detection priority list to the `source` section.

**c) workersSource()**

**Source truth** (`workers.ts:3-5`):
```ts
export function workersSource(env: Record<string, string | undefined>): EnvSource {
  return { get: (key: string) => env[key] }
}
```

**Current docs:** No mention of `workersSource`.

**Fix:** Add to environment sources table + dedicated subsection with Cloudflare Workers example.

---

#### C7: `core/schema-composition.mdx` — Client/Server types missing

**Source truth** (`types/schema.ts:7-13`):
```ts
export type ClientServerSchema<
  C extends SchemaDefinition = SchemaDefinition,
  S extends SchemaDefinition = SchemaDefinition,
> = { client: C; server: S }
```

**Source truth** (`types/infer.ts:17-21`):
```ts
export type InferredClientServerEnv<S extends ClientServerSchema> = {
  readonly [K in keyof S["server"]]: S["server"][K] extends Validator<infer V> ? V : never
} & {
  readonly [K in keyof S["client"]]: S["client"][K] extends Validator<infer V> ? V : never
}
```

**Current docs:** No mention.

**Fix:** Add new section after monorepo pattern with `ClientServerSchema`, `InferredClientServerEnv`, and usage example.

---

### 3. @ctroenv/cli — 2 gaps

#### CLI1: `cli/validate.mdx` — JSON output missing fields

**Source truth** (`validate.ts:106-114`):
```ts
const result = {
  version: CLI_VERSION,   // package.json version string
  valid: errors.length === 0,
  source: sourceName,
  total: Object.keys(schema).length,
  errors: errors.length,
  variables: [...],
  timestamp: new Date().toISOString(),
}
```

**Current docs JSON example:**
```json
{ "valid": false, "source": ".env", "total": 5, "errors": 2, "variables": [...] }
```

Missing: `version`, `timestamp`.

**Fix:** Update JSON example to include `version` and `timestamp`.

---

#### CLI2: `cli/check.mdx` — JSON output missing summary block

**Source truth** (`check.ts:105-120`):
```ts
const output = {
  source: options.source,
  total: ...,
  clean: boolean,
  summary: { missing: N, unused: N, matched: N },
  found: N,
  missing: string[],
  unused: string[],
  matched: string[],
  validationErrors: ... | null,
  unknownSuggestions: Array<{ key, suggestion }>,
}
```

**Current docs:** Only mentions that `--json` flag exists. No JSON structure documented.

**Fix:** Add JSON output structure with `summary` block and `unknownSuggestions` example.

---

### 4. @ctroenv/node — ✅ No issues

`native` option already added in our docs update. All other API surface verified correct:
- `loadEnv(opts?)` with `path`, `encoding`, `override`, `system`, `native`
- `nodeSource()`
- `parseEnvFile(content)`

---

### 5. @ctroenv/vite — ✅ No issues

`maskWith` option already added. All verified:
- `ctroenvPlugin(opts)` with `schema`, `failOnError`, `maskWith`
- `viteSource()`

---

### 6. @ctroenv/nextjs — 2 gaps

#### N1: Missing secret access via `meta.get()`

**Source truth** (`nextjs/src/index.ts:59-77`):
```ts
function getMeta() {
  const srvMeta = (server as any).meta
  if (srvMeta && typeof (srvMeta as any).get === "function") return srvMeta
  const cliMeta = (client as any).meta
  if (cliMeta && typeof (cliMeta as any).get === "function") return cliMeta
  return undefined
}
const meta = getMeta()
if (meta) Object.freeze(meta)
```

Server secrets are masked by core's proxy (`"********"`). Raw values accessible only via `meta.get("KEY")`.

**Current docs:** No mention of secret access pattern.

**Fix:** Add "Accessing Secret Values" subsection after server/client boundary section.

---

#### N2: Imports show outdated `NextSchemaDefinition`

**Source truth** (`nextjs/src/index.ts:13-16`):
```ts
/** @deprecated Use `ClientServerSchema` from @ctroenv/core */
export type NextSchemaDefinition = ClientServerSchema
export type InferredNextEnv<T extends NextSchemaDefinition> = InferredClientServerEnv<T>
```

**Current docs** (lines 21-34): Uses `NextSchemaDefinition` as primary import. Doesn't show `ClientServerSchema` from core.

**Fix:** Update schema definition code block to import `ClientServerSchema` from core. Add deprecation note for `NextSchemaDefinition`.

---

### 7. AGENTS.md — 6 stale sections

1. **Validator table** (line 18-21): Only lists 4 validators. Missing `semver()`, `ip()`, `ipv4()`, `ipv6()`, `uuid()`, `guid()`.
2. **String refinements** (line 18): Missing `.hostname()`.
3. **`defineEnv` options** (line 48): Only mentions `source` and `prefix`. Missing `maskWith`.
4. **Sources** (line 48): Missing `workersSource()` and `objectSource()`.
5. **`loadEnv`** (line 122): Missing `native` option.
6. **Custom validator** (line 148): Only shows `parseOk`, `singleError`, `errInvalid`. Missing `parseFail`, `errMissing`, `errWrap`, `errType`.

---

### 8. SKILL.md — 8 stale sections

1. **Package versions** (lines 16-21): All show `1.1.1` or `1.0.3`. Current: core@1.4.0, cli@1.2.2, node@1.1.2, vite@1.0.4, nextjs@1.2.1, shared@1.0.4.
2. **Validator factories** (lines 36-39): Missing `semver()`, `ip()`, `ipv4()`, `ipv6()`, `uuid()`, `guid()`.
3. **String refinements** (line 77): Missing `.hostname()`.
4. **Standalone refinements** (line 42): Missing `hostname` (correct — not a standalone refinement).
5. **Sources** (lines 69-71): Missing `workersSource()`. Missing `objectSource()` name correct.
6. **CLI validate** (lines 183-186): Lists `--strict` flag for validate. Source shows `--strict` is only for `check`, not `validate`. Validate has `--source`, `--watch`, `--json`.
7. **CLI check** (lines 192-196): Missing `--warn-unknown` flag.
8. **Node.js adapter** (lines 149-156): Missing `native` option on `loadEnv`.

---

### 9. NEW: `core/security.mdx`

Phase 5 security features are scattered across multiple pages. A dedicated security page should cover:

- Secret masking mechanism (Proxy traps: get, getOwnPropertyDescriptor, ownKeys, has)
- `configurableMask` / `maskWith` option
- `util.inspect` support via `Symbol.for("nodejs.util.inspect.custom")`
- `structuredClone` limitation (V8-level, cannot fix)
- Error message masking for secret variables
- `getOwnPropertyDescriptor` protection
- Best practices: chain order, explicit `meta.get()` access
