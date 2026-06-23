# Phase 5: Security Hardening (Corrected)

**Branch:** `phase/05-security`
**Target tag:** `v1.7.0`
**Packages affected:** `core`, `cli`, `nextjs`, `vite`

---

## Deep Review Results

Before implementation, the existing plan was audited against the current codebase (Phases 1-4 merged). **Two critical security bugs** were found:

1. **`getOwnPropertyDescriptor` leak** — `Object.getOwnPropertyDescriptor(env, "SECRET")` returns `{ value: "actual-secret", writable: true, ... }`, exposing the raw value through the descriptor.
2. **Error message leak** — `pick.ts:49` embeds the raw input in the error message string (e.g., `Expected one of 'dev', 'prod', received "actual-secret"`). The masking in `validate.ts` only masks the `value` field, not the `message` string.

---

## 5.1 Configurable Mask String

**Current state:** `DefineEnvOptions` has no `maskWith` field. Core hardcodes `"********"`. CLI has `secrets.maskWith` but never passes it to core.

**Fix:**
- Add `maskWith?: string` to `DefineEnvOptions`
- Pass through `defineEnv()` → `createMaskedEnv()` → Proxy handler
- Default: `"********"` when `undefined`, allow empty string `""` when explicitly set

**Edge case:** Treat `undefined` (not provided) as "use default `"********"`", treat `""` as "explicitly empty mask". This way `maskWith: ""` produces empty output for secrets (useful for testing), while `undefined` preserves security defaults.

**Files:**
- `packages/core/src/types/index.ts` — add `maskWith` to `DefineEnvOptions`
- `packages/core/src/define-env/index.ts` — pass `maskWith` to `createMaskedEnv`, use instead of hardcoded `MASKED`
- `packages/cli/src/commands/validate.ts` — pass `secrets.maskWith` to `defineEnv`
- `packages/nextjs/src/index.ts` — expose `maskWith` in Next.js `defineEnv` options
- `packages/vite/src/index.ts` — expose `maskWith` in Vite plugin options

---

## 5.2 StructuredClone Safety

**Technical limitation:** `structuredClone(env)` throws `DataCloneError` — **this is impossible to fix** because V8's structured clone operates at the C++ level and doesn't consult JavaScript Proxy traps. This is a fundamental V8 limitation shared by all Proxy-based env libraries.

**What we CAN fix:**
- Add `Symbol.for("nodejs.util.inspect.custom")` handler to the Proxy so `console.log(env)` and `util.inspect(env)` return masked values
- `JSON.stringify(env)` already works correctly (Proxy intercepts `toJSON` implicitly)
- `{ ...env }` and `Object.assign({}, env)` already work correctly
- `util.inspect(env)` will work after the fix

**Files:**
- `packages/core/src/define-env/index.ts` — add `Symbol.for("nodejs.util.inspect.custom")` handler

---

## 5.3 Fix Secret Value Leak in Error Messages (CRITICAL)

**Bug:** `packages/core/src/validators/pick.ts:49` constructs error messages like:
```ts
`Expected one of ${expected}, received "${input}"`
```
For `pick(["a","b"]).secret()`, the raw secret value appears in the error message string. The masking in `validate.ts` only replaces `e.value` with `"********"`, but `e.message` still contains the raw value.

**Fix:** In `validate.ts`, when `isSecret` is true, also replace the error message with a generic string:
```ts
errors.push(
  ...result.errors.map((e) => {
    const maskedValue = isSecret ? maskString : (e.value ?? raw)
    const maskedMessage = isSecret ? "Invalid value for secret variable" : e.message
    return errWrap(key, maskedValue, maskedMessage, e.code, {
      suggestion: e.suggestion,
    })
  }),
)
```

**Hardening:** Also fix `pick.ts:49` to not embed raw values in messages — put them only in the `value` field.

**Files:**
- `packages/core/src/define-env/validate.ts` — mask `message` for secret vars
- `packages/core/src/validators/pick.ts` — avoid raw value in message

---

## 5.4 Fix getOwnPropertyDescriptor Leak (CRITICAL)

**Bug:** The Proxy's `getOwnPropertyDescriptor` trap at `packages/core/src/define-env/index.ts:89` returns `Reflect.getOwnPropertyDescriptor(values, key)` which includes the actual secret value in the descriptor's `value` field.

```ts
Object.getOwnPropertyDescriptor(env, "JWT_SECRET")
// → { value: "actual-secret-value", writable: true, enumerable: true, configurable: true }
```

**Fix:** Mask the descriptor's `value` for secret keys:
```ts
getOwnPropertyDescriptor(_target, key) {
  if (key === "meta") return { ... }
  const desc = Reflect.getOwnPropertyDescriptor(values, key)
  if (desc && typeof key === "string" && secretKeys.has(key)) {
    return { ...desc, value: maskWith }
  }
  return desc
}
```

**Files:**
- `packages/core/src/define-env/index.ts` — mask descriptor value

---

## 5.5 originalValue Verification

**Current state:** 
- `ValidationError.value` is overloaded — sometimes it's the original raw input (from `errType`), sometimes it's the parsed value (from `errInvalid`)
- `errType` has `originalValue` as an opts param, mapped to `value`
- `errInvalid` has no `originalValue` concept — takes `value` directly

**Fix:**
- Add `readonly originalValue?: unknown` to `ValidationError`
- Add `originalValue` to `errInvalid` and `errWrap` opts
- In `errInvalid`, prefer `opts.originalValue` for the `originalValue` field, use `value` for the `value` field
- In `validate.ts`, when constructing masked errors, copy `originalValue` through (masked too for secrets)

**Files:**
- `packages/core/src/errors/validation-error.ts` — add `originalValue`
- `packages/core/src/errors/messages.ts` — pass through in `errType`, `errInvalid`, `errWrap`

---

## Verification

```bash
npx vitest run packages/core packages/cli packages/nextjs packages/vite
npx tsc --noEmit -p packages/core/tsconfig.json
npx @biomejs/biome check packages/core/src packages/cli/src

# Manual security verification
node -e "
const { defineEnv, string, pick } = require('@ctroenv/core')
const env = defineEnv({ JWT: string().secret() }, { source: { JWT: 'real-value' }, maskWith: '***' })
console.log(env.JWT)  // '***'
console.log(Object.getOwnPropertyDescriptor(env, 'JWT'))  // { value: '***', ... }
console.log(JSON.stringify(env))  // {'JWT':'***'}
"
```
