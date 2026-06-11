import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createJiti } from "jiti"
import type { CliConfig, ResolvedConfig } from "../types"
import { cliLogger } from "./logger"

const CONFIG_FILES = [
  "ctroenv.config.ts",
  "ctroenv.config.js",
  "ctroenv.config.mjs",
  "ctroenv.json",
]

const DEFAULTS: ResolvedConfig = {
  schema: "src/env.ts",
  sources: { default: ".env" },
  output: {
    example: ".env.example",
    docs: "ENVIRONMENT.md",
  },
  secrets: {
    mask: [],
    maskWith: "***",
  },
}

let _jiti: ReturnType<typeof createJiti> | null = null

function getJiti(): ReturnType<typeof createJiti> {
  if (!_jiti) {
    _jiti = createJiti(import.meta.url, { interopDefault: true })
  }
  return _jiti
}

export function resolveConfig(
  cwd: string,
  overrides?: Partial<CliConfig> | Record<string, unknown>,
): ResolvedConfig {
  const file = loadConfigFile(cwd)
  const config = file ?? ({} as CliConfig)
  return {
    schema: (overrides as CliConfig | undefined)?.schema ?? config.schema ?? DEFAULTS.schema,
    sources: { ...DEFAULTS.sources, ...config.sources, ...(overrides?.sources ?? {}) },
    output: { ...DEFAULTS.output, ...config.output, ...(overrides?.output ?? {}) },
    secrets: { ...DEFAULTS.secrets, ...config.secrets, ...(overrides?.secrets ?? {}) },
  }
}

export function loadConfigFile(cwd: string): CliConfig | null {
  for (const file of CONFIG_FILES) {
    const path = resolve(cwd, file)
    if (!existsSync(path)) continue
    try {
      if (file.endsWith(".json")) {
        return JSON.parse(readFileSync(path, "utf-8")) as CliConfig
      }
      const mod = getJiti()(path)
      return (mod as { default?: CliConfig }).default ?? (mod as CliConfig)
    } catch (e) {
      cliLogger.warn(`Could not load config file ${file}:`, e)
      return null
    }
  }
  return null
}
