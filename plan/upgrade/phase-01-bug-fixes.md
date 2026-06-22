# Phase 1: Bug Fixes & Validation Hardening

**Branch:** `phase/01-bug-fixes`
**Target tag:** `v1.3.0`
**Packages affected:** `core`, `nextjs`

---

## 1.1 Accept `structuredClone` Limitation on Proxy

**Problem:** `defineEnv()` returns a Proxy-wrapped object. `structuredClone(env)` throws `DataCloneError` because Proxies are not clonable. Same limitation as envalid#177.

**Decision:** This is a fundamental Proxy limitation — same across all Proxy-based env libraries. Document that `JSON.parse(JSON.stringify(env))` works for serialization (secrets are masked, `meta` is non-enumerable). No code change needed.

**Acceptance:**
- `JSON.parse(JSON.stringify(env))` returns a plain object with masked secrets — tested
- `structuredClone(env)` documented as unsupported (known limitation)
- No crash from `console.log` or normal usage

---

## 1.2 Fix URL Validation

**Problem:** `new URL("not-a-url")` accepts strings without protocol as relative paths on some Node versions. `string().url()` passes values like `"example.com"` (no protocol).

**Fix:** In `packages/core/src/validators/refinements/url.ts` and the chainable `.url()` method in `packages/core/src/validators/string.ts`, add protocol check after `new URL()`:

```ts
try {
  const parsed = new URL(v)
  if (!parsed.protocol || parsed.protocol === "file:") return false
  return true  // was the original parseOk path
} catch { return false }
```

**Files:**
- `packages/core/src/validators/string.ts` — chainable `.url()` method
- `packages/core/src/validators/refinements/url.ts` — standalone `url()` refinement

**Acceptance:**
- `string().url().parse("https://example.com")` → success
- `string().url().parse("example.com")` → failure
- `string().url().parse("not-a-url")` → failure
- `string().url().parse("file:///etc/passwd")` → failure

---

## 1.3 Fix Email Regex

**Problem:** Current regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` is very permissive.

**Fix:** Use the HTML5 email validation regex — widely tested, accepts common email formats, rejects obvious non-emails. Does not enforce TLD policy (accepts `a@b.c` as syntactically reasonable).

```ts
const emailRe = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
```

**Files:**
- `packages/core/src/validators/string.ts` — chainable `.email()` method
- `packages/core/src/validators/refinements/email.ts` — standalone `email()` refinement

**Acceptance:**
- `string().email().parse("user@example.com")` → success
- `string().email().parse("a@b.c")` → failure (single-char TLD rejected by length check)
- `string().email().parse("not-an-email")` → failure
- `string().email().parse("user+tag@example.co.uk")` → success

---

## 1.4 Fix `pick([])` with Empty Array

**Problem:** `pick([] as const)` creates a validator that rejects everything but gives an unhelpful error.

**Fix:** In `packages/core/src/validators/pick.ts`, add a guard at the start:

```ts
if (values.length === 0) {
  throw new TypeError("pick() requires at least one allowed value")
}
```

**Files:**
- `packages/core/src/validators/pick.ts` — add guard in factory function

**Acceptance:**
- `pick(["a", "b"] as const)` → works as before
- `pick([] as const)` → throws `TypeError` with clear message

---

## 1.5 Fix `number()` to Reject Hex/Octal/Scientific

**Problem:** `Number("0xFF")` returns 255, `Number("1e2")` returns 100, `Number("  ")` returns 0. These are silently accepted.

**Fix:** In `packages/core/src/validators/number.ts`, add strict string validation before calling `Number()`:

```ts
if (typeof input === "string") {
  if (/^[+-]?\d+(\.\d+)?$/.test(input.trim()) === false) {
    return singleError(errType(ctx.key, typeof input, "number"))
  }
}
```

This allows: `"123"`, `"-45"`, `"3.14"`, `"+7"`
Rejects: `"0xFF"`, `"1e2"`, `"  "`, `"abc"`, `"Infinity"`

**Files:**
- `packages/core/src/validators/number.ts` — add regex guard in parse function

**Acceptance:**
- `number().parse("123")` → 123
- `number().parse("3.14")` → 3.14
- `number().parse("-5")` → -5
- `number().parse("0xFF")` → failure
- `number().parse("1e2")` → failure
- `number().parse("  ")` → failure
- `number().parse("Infinity")` → failure
- `number().parse(123)` → 123 (number input still works)

---

## 1.6 Add Case-Insensitive Boolean Matching

**Problem:** `boolean()` only accepts lowercase `"true"`, `"yes"`, `"on"`, etc. But real-world `.env` files often use `TRUE`, `True`, `YES`, `Y`.

**Fix:** In `packages/core/src/validators/boolean.ts`, the existing `.trim().toLowerCase()` already handles case. Also add short forms:

```ts
const truthy = new Set(["true", "yes", "on", "1", "y", "t"])
const falsy = new Set(["false", "no", "off", "0", "n", "f"])
```

**Files:**
- `packages/core/src/validators/boolean.ts` — extend truthy/falsy sets

**Acceptance:**
- `boolean().parse("TRUE")` → true
- `boolean().parse("True")` → true
- `boolean().parse("y")` → true
- `boolean().parse("n")` → false
- `boolean().parse("t")` → true
- `boolean().parse("f")` → false
- `boolean().parse("Yes")` → true
- `boolean().parse("OFF")` → false

---

---

## 1.8 Fix Next.js Proxy: Don't Let Server Secrets Be Readable

**Problem:** In `packages/nextjs/src/index.ts`, the `createEnvProxy` extracts raw secret values via `srv.meta.get(key)` and returns them on the server. While this is intentional (server needs secrets), it means the Next.js proxy bypasses the core masking. On server, `env.SECRET` returns actual value instead of `"********"`.

**Fix:** Keep the `meta.get()` path but add a separate check: if the schema defines the key as `.secret()`, return `"********"` from the proxy's `get` trap. The raw value should only be accessible through `env.meta.get("SECRET")`.

**Files:**
- `packages/nextjs/src/index.ts` — modify `createEnvProxy` to check schema metadata before returning value

**Acceptance:**
- Server: `env.JWT_SECRET` → `"********"`
- Server: `env.meta.get("JWT_SECRET")` → actual value
- Server: `env.DATABASE_URL` (non-secret) → actual value
- Client: `env.JWT_SECRET` → throws (server-only error)

---

## 1.9 Validate Default Values Against Refinements

**Problem:** `string().url().default("not-a-url")` silently sets an invalid default. It's only caught if the source doesn't provide the value.

**Fix:** In `packages/core/src/validators/chain.ts`, in `.default(value: T)` method, run the validator's own `parse` on the default value in development mode:

```ts
default(value: T) {
  if (process.env.NODE_ENV === "development") {
    const result = ((this as unknown) as Validator<T>).parse(value as unknown as string, { key: ".default()", path: [] })
    if (!result.success) {
      console.warn(`[ctroenv] Default value for "${(this as any).metadata?.description || 'unknown'}" fails validation: ${result.errors[0]?.message}`)
    }
  }
  // ... existing logic
}
```

**Files:**
- `packages/core/src/validators/chain.ts` — modify `.default()` method

**Acceptance:**
- `string().url().default("https://valid.com")` → no warning
- `string().url().default("not-a-url")` → dev warning (NODE_ENV=development)
- `number().int().default(3.14)` → dev warning

---

## Verification for Phase 1

```bash
# Run tests for affected packages
npx vitest run packages/core
npx vitest run packages/nextjs

# Type check
npx tsc --noEmit

# Lint
npx @biomejs/biome check packages/core/src packages/nextjs/src

# Size check
cd packages/core && npx size-limit
cd packages/nextjs && npx size-limit

# Build
cd packages/core && npx tsup
cd packages/nextjs && npx tsup
```
