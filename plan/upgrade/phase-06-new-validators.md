# Phase 6: New Validators

**Branch:** `phase/06-validators`
**Target tag:** `v1.8.0`
**Packages affected:** `core`

---

## 6.1 semver() Validator

A `semver()` validator that accepts semver strings like `"1.2.3"`, `">=1.0.0"`, `"~1.2.0"`.

```ts
function semver() {
  const base = createValidator<string>(
    (input, ctx) => {
      if (typeof input !== "string") return singleError(errType(ctx.key, typeof input, "semver"))
      return /^\d+\.\d+\.\d+$/.test(input)
        ? parseOk(input)
        : singleError(errInvalid(ctx.key, input, "Must be a valid semver (e.g. 1.2.3)"))
    },
    { typeLabel: "semver" },
  )
  return applyChain(base)
}
```

**Files:**
- `packages/core/src/validators/semver.ts` — new file
- `packages/core/src/validators/index.ts` — add export
- `packages/core/src/index.ts` — add export

---

## 6.2 ip() Validator

An IP address validator supporting both IPv4 and IPv6:

```ts
function ip(options?: { version?: "4" | "6" | "both" }) {
  // ...
}
```

Supports validation for IPv4 only, IPv6 only, or both.

**Files:**
- `packages/core/src/validators/ip.ts` — new file
- `packages/core/src/validators/index.ts` — add export
- `packages/core/src/index.ts` — add export

---

## 6.3 uuid() Validator

A UUID validator supporting v4 and v5:

```ts
function uuid(options?: { version?: "4" | "5" | "any" }) {
  // ...
}
```

**Files:**
- `packages/core/src/validators/uuid.ts` — new file
- `packages/core/src/validators/index.ts` — add export
- `packages/core/src/index.ts` — add export

---

## Verification

```bash
npx vitest run packages/core
npx tsc --noEmit
npx @biomejs/biome check packages/core/src

# Size check — must stay under 5 KB
cd packages/core && npx size-limit
```
