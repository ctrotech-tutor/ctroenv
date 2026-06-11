import { existsSync } from "node:fs"
import { resolve } from "node:path"

const SEARCH_PATHS = [
  "src/env.ts",
  "src/env/index.ts",
  "env.ts",
  "env.config.ts",
  "src/env.js",
  "src/env/index.js",
  "env.js",
  "env.config.js",
]

export function findSchema(cwd: string, configPath?: string | null): string | null {
  if (configPath) {
    const resolved = resolve(cwd, configPath)
    if (existsSync(resolved)) return resolved
    return null
  }
  for (const p of SEARCH_PATHS) {
    const resolved = resolve(cwd, p)
    if (existsSync(resolved)) return resolved
  }
  return null
}
