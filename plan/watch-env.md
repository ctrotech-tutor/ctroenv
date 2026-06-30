# Phase 2: watchEnv() — Reactive Environment Validation

## Motivation

From the Formit engineer review: "there is no way to reactively re-validate when the .env file changes." Currently, `defineEnv()` runs once. Users who edit `.env` during development must restart their process. `watchEnv()` lets the env object update itself when the source changes.

## Scope

**Package:** `@ctroenv/core` (new standalone export)

**Does NOT touch:** CLI, framework adapters (they can adopt it later)

## API Design

```ts
import { watchEnv, string, number } from "@ctroenv/core"

const env = watchEnv(schema, {
  source: loadEnv(),        // same EnvSource as defineEnv
  pollInterval: 1000,       // ms, default 500. used when no fs.watch available
  onChange: (key, oldVal, newVal) => {
    // called per changed key after re-validation
  },
  onError: (errors) => {
    // called when re-validation fails — env is NOT updated
  },
})
```

### Return Value

`WatchEnvResult<T>` — extends `EnvResult<T>` with:

```ts
interface WatchEnvResult<T> extends EnvResult<T> {
  // Same proxy + meta as defineEnv
  // Plus:
  unwatch(): void           // stop watching, clean up listeners
}
```

### Behavior

1. **Initial call** — runs `defineEnv()` immediately (same validation logic). Throws on first failure.

2. **Re-validation** — when source signals a change, re-runs `walkSchema()`. If all validators pass, the underlying values object is updated. The Proxy serves the new values. If validation fails, `onError` is called and the env object keeps the old valid values.

3. **Source change detection** — poll-based by default (poll source every `pollInterval` ms). The `EnvSource` interface (`{ get(key): string | undefined }`) is stateless — no event emitter. Polling is the lowest-common-denominator. Framework adapters (Node, Vite) can layer fs.watch on top.

4. **Secret masking preserved** — same Proxy logic from `createMaskedEnv()` is reused.

5. **onChange callback** — fires per changed key AFTER the underlying values are updated. `oldVal` is the previous parsed value, `newVal` is the new parsed value.

6. **onError callback** — fires with the full error array when re-validation fails. The env object is NOT mutated — it keeps the last valid state.

## Implementation Plan

### Step 1: Core API (`packages/core/src/watch-env/index.ts`)

```
packages/core/src/
  watch-env/
    index.ts          ← watchEnv() + WatchEnvResult
    __tests__/
      index.test.ts   ← tests
```

```ts
// watch-env/index.ts
import type { EnvMeta, EnvResult, SchemaDefinition } from "../types"
import type { DefineEnvOptions } from "../define-env"
import { defineEnv } from "../define-env"
import { walkSchema } from "../define-env/validate"

export interface WatchEnvOptions<T extends SchemaDefinition> extends DefineEnvOptions {
  pollInterval?: number
  onChange?: (key: string, oldValue: unknown, newValue: unknown) => void
  onError?: (errors: ValidationError[]) => void
}

export interface WatchEnvResult<T extends SchemaDefinition> extends EnvResult<T> {
  unwatch(): void
}

export function watchEnv<T extends SchemaDefinition>(
  schema: T,
  opts?: WatchEnvOptions<T>,
): WatchEnvResult<T>
```

### Step 2: Polling Engine

- Uses `setInterval` (Node) or `setTimeout` chain (Edge-compatible)
- Stores last known raw values (from `source.get(key)`)
- On each tick, re-reads all source values, compares with last raw values
- Only runs `walkSchema()` when at least one raw value changed
- To avoid duplicate work: compare `source.get(key)` strings against cached map

### Step 3: Integration with Framework Adapters

- **Node adapter** (`@ctroenv/node`): `loadEnv({ watch: true })` — adds `fs.watch` on `.env` file directory, calls `onChange` callback when files change. The polling in `watchEnv` detects the change on next tick.
- **Vite plugin** (`@ctroenv/vite`): Already has HMR. The plugin's `buildStart` can be extended to re-validate on HMR updates.
- **Next.js adapter** (`@ctroenv/nextjs`): Next.js doesn't HMR server-side env vars naturally. Watch mode is development-only.

### Step 4: Export from Core

Add to `packages/core/src/index.ts`:
```ts
export { watchEnv } from "./watch-env"
export type { WatchEnvOptions, WatchEnvResult } from "./watch-env"
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `packages/core/src/watch-env/index.ts` | Create |
| `packages/core/src/watch-env/__tests__/index.test.ts` | Create |
| `packages/core/src/index.ts` | Modify (add export) |
| `apps/docs/content/v1/docs/core/watch-env.mdx` | Create (new doc page) |
| `apps/docs/content/v1/docs/meta.json` | Modify (add watch-env to nav) |

## Edge Cases

1. **Source has no change detection** — polling is the only option. `EnvSource` interface has no `subscribe(cb)`. This is fine; polling is simple and reliable.

2. **Re-validation fails** — env object keeps old valid state. Never silently serves invalid values.

3. **Source becomes unavailable** (e.g., file deleted) — `source.get()` returns `undefined`. Missing required vars trigger `onError`. If env was previously valid, old values are preserved.

4. **Concurrent changes** — polling reads raw values in a batch. If multiple keys change between ticks, they're all detected and re-validated together.

5. **Performance** — `walkSchema()` is already optimized (no I/O, just type checks + regex). Polling at 500ms is negligible overhead.

## Out of Scope (for this phase)

- **Framework-level file watching** — Node adapter `fs.watch` integration will be a separate PR.
- **`detectSource().subscribe()`** — making sources push-based. Not needed for polling approach.
- **CLI `--watch` improvement** — the CLI already has `--watch` using chokidar. It can remain independent.
- **HMR for Next.js adapter** — Next.js env behavior is complex; defer to a future phase.

## Test Plan

1. Unit test: initial validation matches `defineEnv()`
2. Unit test: source change triggers re-validation
3. Unit test: re-validation failure preserves old values
4. Unit test: `onChange` fires with correct old/new values
5. Unit test: `unwatch()` stops polling
6. Unit test: `env.meta` stays in sync after re-validation
7. Unit test: secret masking works through re-validation
