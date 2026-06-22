# Phase 3: Cross-Runtime Support

**Branch:** `phase/03-cross-runtime`
**Target tag:** `v1.5.0`
**Packages affected:** `core`, `node`

---

## 3.1 Core: Detect Deno

In `packages/core/src/define-env/source.ts`, add Deno detection:

```ts
function tryDenoEnv(): EnvSource | null {
  if (typeof Deno !== "undefined" && Deno.env) {
    return { get: (key: string) => Deno.env.get(key) }
  }
  return null
}
```

Then add to `detectSource()`: `const denoSource = tryDenoEnv()` and merge with existing sources.

Priority: `import.meta.env` > `Deno.env` > `process.env`

**Files:**
- `packages/core/src/define-env/source.ts`

---

## 3.2 Core: Detect Bun

Bun already works via `process.env`, but add explicit detection for better error messages and future compatibility:

```ts
function tryBunEnv(): EnvSource | null {
  if (typeof Bun !== "undefined" && Bun.env) {
    return { get: (key: string) => Bun.env[key] }
  }
  return null
}
```

**Files:**
- `packages/core/src/define-env/source.ts`

---

## 3.3 Core: Cloudflare Workers Adapter

Create a new file `packages/core/src/define-env/cf-worker.ts`:

```ts
export function cfWorkerSource(env: Record<string, string>): EnvSource {
  return {
    get: (key: string) => env[key]
  }
}
```

This is a simple wrapper — CF Workers pass env vars as a parameter to the fetch handler. Users would call:

```ts
import { defineEnv, cfWorkerSource } from "@ctroenv/core"

export default {
  async fetch(request: Request, env: Env) {
    const validated = defineEnv(schema, { source: cfWorkerSource(env as any) })
    // ...
  }
}
```

Export `cfWorkerSource` from `packages/core/src/index.ts`.

**Files:**
- `packages/core/src/define-env/cf-worker.ts` — new file
- `packages/core/src/index.ts` — add export

---

## 3.4 Node: Native `--env-file` Support

In `packages/node/src/index.ts`, modify `loadEnv` to use Node 22+'s built-in `process.loadEnvFile()` when available instead of always using the custom parser:

```ts
// Before custom parsing, try native
if (!opts?.encoding && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(opts?.path)
    return nodeSource()
  } catch { /* fall through to custom parsing */ }
}
```

**Files:**
- `packages/node/src/index.ts`

---

## Verification

```bash
npx vitest run packages/core packages/node
npx tsc --noEmit
npx @biomejs/biome check packages/core/src packages/node/src
```
