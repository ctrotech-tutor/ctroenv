// Browser-safe entry: `viteSource()` only. This module (and everything it
// re-exports) must never import `node:*` or `vite` — bundlers resolve the
// package's `default` export condition to this file for client builds, and
// any Node-only import breaks them. Enforced by `browser.test.ts`.
export { viteSource } from "./source"
