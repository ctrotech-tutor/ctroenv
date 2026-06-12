# Phase 4 — Polish & Developer Experience

**Duration:** Week 7  
**Goal:** Refine every edge of the developer experience — error messages, performance benchmarks, and bundle size optimization.

---

## 4.1 Error Message Refinement

### Architecture

```
packages/core/src/errors/
├── messages.ts          # NEW — centralized error message factory
├── formatter.ts         # REWRITE — richer output, NO_COLOR support
├── ctroenv-error.ts     # unchanged
├── validation-error.ts  # unchanged
├── error-codes.ts       # unchanged
├── index.ts             # update export
└── __tests__/
    ├── formatter.test.ts  # update
    └── messages.test.ts   # NEW
```

### Error Message Factory (`messages.ts`)

Every `ValidationError` is created through a factory function. This ensures:
- Consistent phrasing across all validators
- Every error has an appropriate code and suggestion
- Single place to update message templates

| Function | Code | Use |
|---|---|---|
| `errMissing(key, opts?)` | `missing_required` | Required var not found |
| `errType(key, received, expected, opts?)` | `type_mismatch` | Wrong type (e.g. string vs number) |
| `errInvalid(key, value, message, opts?)` | `invalid_value` | Value fails refinement |
| `errCoerce(key, value, message, opts?)` | `coercion_failed` | Coercion attempt failed |

### Output Style

```
●  Missing required (2)
   DATABASE_URL — PostgreSQL connection URL
   → Add DATABASE_URL to your .env file

   JWT_SECRET  — Required — no default

✗  Invalid (1)
   PORT
   Expected a port number (1-65535), received "99999"
   → Ensure the value is between 1 and 65535

→ Define once. Trust everywhere.
```

### NO_COLOR Support

- Core formatter checks `process.env.NO_COLOR` and `process.env.CI`
- Falls back to plain text when colors are disabled
- Uses same ANSI approach but conditionally applied

---

## 4.3 Performance Benchmarks

### Tool: `vitest bench`

Vitest built-in benchmark — no new dependencies. Same config, same CI integration.

### Benchmark Suites

| File | Scenarios |
|---|---|
| `packages/core/src/__benchmarks__/validate.bench.ts` | 5 fields pass, 5 fields fail, 20 fields pass, 20 fields fail |
| `packages/cli/src/__benchmarks__/commands.bench.ts` | Schema parse only (no I/O) |

### Targets

| Benchmark | Target |
|---|---|
| Validate 5 fields (pass) | < 0.1ms |
| Validate 5 fields (fail, 2 errors) | < 0.2ms |
| Validate 20 fields (pass) | < 0.3ms |
| Validate 20 fields (fail, 3 errors) | < 0.5ms |

### CI Integration

```yaml
- run: vitest bench --run
```

---

## 4.5 Bundle Size Optimization

### Tool: `size-limit` with `@size-limit/file`

Works on any build output (no webpack dependency), supports CI gating.

### Targets (gzipped)

| Package | Target | Max |
|---|---|---|
| `@ctroenv/core` | < 5 KB | < 8 KB |
| `@ctroenv/cli` (index) | < 15 KB | < 20 KB |
| `@ctroenv/cli` (cli) | < 12 KB | < 15 KB |
| `@ctroenv/node` | < 1 KB | < 2 KB |
| `@ctroenv/vite` | < 1 KB | < 2 KB |
| `@ctroenv/nextjs` | < 2 KB | < 3 KB |

### CI Integration

```yaml
- run: npm run size-all
```

---

## Acceptance Criteria

- [ ] All error messages use the centralized factory
- [ ] Every error has a clear suggestion
- [ ] NO_COLOR / CI env respected by core formatter
- [ ] Performance benchmarks established and under targets
- [ ] Bundle size limits configured for all published packages
- [ ] CI gates for performance and size
