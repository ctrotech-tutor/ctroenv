import { defineConfig } from "tsup"

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    minify: true,
    sourcemap: true,
    splitting: false,
    external: ["vite"],
  },
  // Browser-safe entry (`viteSource` only). No types of its own: both export
  // conditions share index.d.ts so `ctroenvPlugin` keeps working types in
  // `vite.config.ts` (Node) while client bundles stay Node-free.
  {
    entry: ["src/browser.ts"],
    format: ["esm"],
    dts: false,
    minify: true,
    sourcemap: true,
    splitting: false,
  },
])
