import { defineConfig } from "tsup"

export default defineConfig([
  {
    entry: ["src/cli.ts"],
    format: ["esm"],
    dts: false,
    clean: true,
    minify: true,
    sourcemap: true,
    splitting: false,
  },
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: false,
    minify: true,
    sourcemap: true,
    splitting: false,
  },
])
