# Phase 2: Client/Server Variable Split

**Branch:** `phase/02-client-server`
**Target tag:** `v1.4.0`
**Packages affected:** `core`, `nextjs`, `vite`

---

## 2.1 Core: Client/Server Schema Type

Add a new exported type `ClientServerSchema` and `defineEnv` overload in core:

```ts
export type ClientServerSchema = {
  client: SchemaDefinition
  server: SchemaDefinition
}
```

This lives in `packages/core/src/types/schema.ts` or a new file.

---

## 2.2 Core: Source Abstraction for Client vs Server

Add a `mode` option to `DefineEnvOptions`:

```ts
export interface DefineEnvOptions {
  source?: EnvSource | Record<string, string | undefined>
  prefix?: string
  mode?: "server" | "client"  // NEW
}
```

When `mode: "client"`, the returned `EnvResult` should have server-only vars set to `undefined` at runtime (they can't exist in the browser).

When `mode: "server"`, all vars are validated as usual.

---

## 2.3 Next.js: Use Client/Server Split Properly

Currently `@ctroenv/nextjs` validates both schemas on server and only `client` on client. But the proxy still allows accessing server values through `meta`. 

Rewrite `defineEnv` in nextjs adapter to:

1. Accept `{ server: {...}, client: {...} }` (already does)
2. On server: validate both, return combined with server vars masked behind `meta`
3. On client: validate only client vars, throw on server var access (already does)
4. Ensure `JSON.stringify(env)` on server doesn't leak secrets (non-enumerable `meta`)

**Files:**
- `packages/nextjs/src/index.ts` — rewrite `createEnvProxy`

---

## 2.4 Vite: Client/Server Split

Add a `mode` option to `CtroEnvPluginOptions` so the Vite plugin can be configured:

```ts
ctroenvPlugin({
  schema: "./src/env.ts",
  mode: "client"  // only validates client vars in browser build
})
```

**Files:**
- `packages/vite/src/index.ts` — add `mode` option to plugin

---

## Verification

```bash
npx vitest run packages/core packages/nextjs packages/vite
npx tsc --noEmit
npx @biomejs/biome check packages/core/src packages/nextjs/src packages/vite/src
```
