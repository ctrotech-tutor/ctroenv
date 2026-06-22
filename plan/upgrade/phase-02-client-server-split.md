# Phase 2: Client/Server Variable Split

**Branch:** `phase/02-client-server`
**Target tag:** `v1.4.0`
**Packages affected:** `core`, `nextjs`, `vite`

---

## 2.1 Core: Client/Server Schema Type

Promote `NextSchemaDefinition` (currently in `@ctroenv/nextjs`) to `@ctroenv/core` as `ClientServerSchema`:

```ts
export type ClientServerSchema = {
  client: SchemaDefinition
  server: SchemaDefinition
}
```

Re-export from `@ctroenv/nextjs` for backward compat. Update Next.js adapter to import from core.

**Files:**
- `packages/core/src/types/index.ts` — add `ClientServerSchema`
- `packages/core/src/index.ts` — export it
- `packages/nextjs/src/index.ts` — import from core, re-export as `NextSchemaDefinition`

---

## 2.2 ~~Core: Source Abstraction for Client vs Server~~ DROPPED

**Why dropped:** The existing Next.js proxy already handles mode correctly — it **throws** on illegal client access (`nextjs/src/index.ts:76-81`). Returning `undefined` (as originally proposed) is a regression; falsy checks silently lie. Adding `mode` to core's `DefineEnvOptions` also conflates framework concepts into a zero-dep core package.

Adapters own visibility logic. Core stays framework-agnostic.

---

## 2.3 Next.js: Proxy Cleanup & Hardening

Phase 1 (1.8) already fixed the secret masking bypass. Remaining work:

1. **`Object.freeze(meta)`** — prevent mutation of the meta object at runtime
2. **Ensure meta passthrough is clean** — verify server meta and client meta merge correctly when both exist
3. **Verify `JSON.stringify(env)` doesn't leak** — meta is already non-enumerable (Phase 1)

**Files:**
- `packages/nextjs/src/index.ts` — minor cleanup in `createEnvProxy`

---

## 2.4 Vite: Client/Server Split — DEFERRED

**Why deferred:** The Vite plugin only validates at **build time** (server-side context). There's no runtime proxy in Vite like Next.js has. Adding a `mode` option now creates an option with no clear runtime behavior. The Vite client/server story needs more design — specifically around how `defineEnv(clientSchema)` would work in browser bundles vs SSR.

For now, `ctroenvPlugin` validates the full schema at build time. If a schema uses `ClientServerSchema`, the plugin should validate both client and server schemas (both are available at build time).

---

## Verification

```bash
npx vitest run packages/core packages/nextjs packages/vite
npx tsc --noEmit
npx @biomejs/biome check packages/core/src packages/nextjs/src packages/vite/src
```
