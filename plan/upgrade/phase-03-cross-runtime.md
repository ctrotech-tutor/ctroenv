# Phase 3: Cross-Runtime Support

**Branch:** `phase/03-cross-runtime`
**Target tag:** `v1.5.0`
**Packages affected:** `core`, `node`

---

## 3.1 Core: Detect Deno

In `packages/core/src/define-env/source.ts`, add Deno detection to `detectSource()`:

```ts
function tryDenoEnv(): EnvSource | undefined {
  try {
    if (typeof Deno !== "undefined" && Deno.env) {
      return { get: (key: string) => Deno.env.get(key) }
    }
  } catch { /* Deno.env.get not available in all contexts */ }
  return undefined
}
```

Priority order: `import.meta.env` > `Deno.env` > `Bun.env` > `process.env`

The Deno source is added before `process.env` so that in Deno, the native `Deno.env.get()` is preferred over the polyfilled `process.env` that some Deno compatibility layers provide.

**Files:**
- `packages/core/src/define-env/source.ts`

---

## 3.2 Core: Detect Bun

Add Bun detection to `detectSource()`. `Bun.env` is an alias of `process.env` — functionally identical. Detection is for diagnostics and future-proofing:

```ts
function tryBunEnv(): EnvSource | undefined {
  try {
    if (typeof Bun !== "undefined" && Bun.env) {
      return { get: (key: string) => Bun.env[key] }
    }
  } catch { /* Bun.env not available in all contexts */ }
  return undefined
}
```

**Why do this if it's the same as `process.env`?**
1. Diagnostic clarity: error messages can say "detected runtime: Bun"
2. Forward compatibility: if Bun ever diverges from `process.env`, we're ready
3. Consistent detection pattern: same as Deno

**Files:**
- `packages/core/src/define-env/source.ts`

---

## 3.3 Core: Cloudflare Workers Adapter

Create `packages/core/src/define-env/workers.ts`:

```ts
export function workersSource(env: Record<string, string | undefined>): EnvSource {
  return { get: (key: string) => env[key] }
}
```

Named `workersSource` instead of `cfWorkerSource` for forward-compatibility with the broader Workers ecosystem.

Usage:
```ts
import { defineEnv, workersSource } from "@ctroenv/core"

export default {
  async fetch(request: Request, env: Record<string, string | undefined>) {
    const validated = defineEnv(schema, { source: workersSource(env) })
    // ...
  }
}
```

**Key decisions:**
- Type `Record<string, string | undefined>` — avoids `as any` cast for CF Workers whose `env` parameter includes non-string bindings (D1, R2, KV). Users filter to only string-typed keys before passing.
- No auto-detection — Workers must explicitly pass the source (same as existing pattern for custom sources)
- Exported from core, not a separate package — Workers is a deployment target, not a framework adapter

**Files:**
- `packages/core/src/define-env/workers.ts` — new file
- `packages/core/src/index.ts` — add export

---

## 3.4 Node: Native `--env-file` Support (Opt-In)

In `packages/node/src/index.ts`, add a `native` option to `LoadEnvOptions`:

```ts
export interface LoadEnvOptions {
  path?: string
  encoding?: BufferEncoding
  override?: boolean
  system?: boolean
  native?: boolean  // NEW: use process.loadEnvFile() when available
}
```

When `native: true` and Node >= 22, use `process.loadEnvFile()` instead of the custom parser:

```ts
if (opts?.native && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(opts?.path)
    return nodeSource()
  } catch { /* fall through to custom parsing */ }
}
```

**Why opt-in, not automatic?**

| Feature | Custom Parser | `process.loadEnvFile()` |
|---------|---------------|------------------------|
| Variable interpolation (`$VAR`, `${VAR}`) | ✅ Yes | ❌ No |
| `export KEY=value` syntax | ✅ Yes | ❌ No |
| Continuation lines with `\` | ✅ Yes | ❌ No |
| Override existing env vars | ✅ `override: true` | ❌ Not supported |
| Speed | Custom JS | Native C++ |

Silently switching to native would break users who rely on interpolation. Opt-in keeps backward compatibility.

**Files:**
- `packages/node/src/index.ts`

---

## Verification

```bash
npx vitest run packages/core packages/node
npx tsc --noEmit
npx @biomejs/biome check packages/core/src packages/node/src
```
