# Phase 5: Security Hardening

**Branch:** `phase/05-security`
**Target tag:** `v1.7.0`
**Packages affected:** `core`, `cli`

---

## 5.1 Configurable Mask String

**Problem:** The mask string `"********"` is hardcoded in `packages/core/src/define-env/index.ts` (line 11). The CLI has its own `maskWith` config but it's not passed to core.

**Fix:** Add `maskWith?: string` to `DefineEnvOptions`:

```ts
export interface DefineEnvOptions {
  source?: EnvSource | Record<string, string | undefined>
  prefix?: string
  mode?: "server" | "client"
  maskWith?: string  // NEW — defaults to "********"
}
```

Pass `maskWith` through to `createMaskedEnv`. CLI should pass `config.secrets.maskWith` to `defineEnv`.

**Files:**
- `packages/core/src/types/schema.ts` — add `maskWith` to `DefineEnvOptions`
- `packages/core/src/define-env/index.ts` — pass `maskWith` to `createMaskedEnv`, use it instead of hardcoded `MASKED`
- `packages/cli/src/commands/validate.ts` — pass `secrets.maskWith` to `defineEnv`

---

## 5.2 StructuredClone Safety

Add a `[Symbol.for("nodejs.util.inspect.custom")]` and handle structured clone in the Proxy. The Proxy's `get` handler should return a plain object when the receiver is the structured clone internal handler:

```ts
// In createMaskedEnv proxy handler
get(target, key, receiver) {
  if (key === Symbol.for("nodejs.util.inspect.custom")) {
    return () => ({ ...target, meta: /* masked meta */ })
  }
  // ... existing logic
}
```

Test `structuredClone(env)` and `util.inspect(env)`.

**Files:**
- `packages/core/src/define-env/index.ts` — modify `createMaskedEnv` proxy

---

## 5.3 Mask Secret Values in Error Output

**Problem:** When validation fails for a secret variable, the error message includes the raw value (truncated to `"********"` by `validate.ts` line 56-62). This is already done! But verify it works for all error paths.

**Check:** Audit all places where errors are created with values to ensure secrets are masked.

**Files:**
- `packages/core/src/define-env/validate.ts` — verify line 56-62 coverage
- `packages/core/src/errors/messages.ts` — check `errType`, `errInvalid`, `errWrap`

---

## 5.4 Block Prototype Access on Proxy

**Problem:** The Proxy's `get` trap uses `Reflect.get(values, key, receiver)`. If someone accesses a prototype property like `toString` on the env object, it returns the actual `Object.prototype.toString`, not a masked value.

**Risk:** Low — this is standard behavior and doesn't leak secrets.

**Action:** Add test to verify that `env.toString` returns the expected function and doesn't leak secret values.

**Files:**
- `packages/core/src/__tests__/define-env.test.ts` (or similar) — add test

---

## 5.5 Add `originalValue` to Error Messages

**Problem:** When a validation error occurs, the error's `value` field contains the raw input. For non-secret vars, this is useful. For secret vars, it's masked. But there's no way to get the original value for debugging in non-secret mode.

**Fix:** Ensure `originalValue` is always populated in `ValidationError` for non-secret vars. This is already supported by the error infrastructure but verify it's actually used.

**Files:**
- `packages/core/src/errors/validation-error.ts` — verify `originalValue` field
- `packages/core/src/errors/messages.ts` — verify opts passthrough

---

## Verification

```bash
npx vitest run packages/core packages/cli
npx tsc --noEmit
npx @biomejs/biome check packages/core/src packages/cli/src

# Manual verification
node -e "
const { defineEnv, string } = require('./packages/core/dist/index.js')
const env = defineEnv({ JWT: string().secret() }, { source: { JWT: 'real-value' }, maskWith: '***' })
console.log(env.JWT)  // Should show '***' 
console.log(JSON.stringify(env))  // Should show '***'
"
```
