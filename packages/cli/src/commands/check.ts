import { existsSync, readFileSync } from "node:fs"
import type { SchemaDefinition } from "@ctroenv/core"
import { CtroEnvError, defineEnv, formatErrors, type ValidationError } from "@ctroenv/core"
import { parse as parseDotenv } from "dotenv"
import { ExitCode } from "../exit-codes"
import type { Format } from "../types"
import { divider, header, hint, success, warning } from "../utils/output"

interface CheckOptions {
  schema: SchemaDefinition
  source: string
  example?: string
  json: Format
  strict?: boolean
}

interface CheckResult {
  missing: string[]
  unused: string[]
  matched: string[]
}

function readEnvKeys(filePath: string): string[] {
  if (!existsSync(filePath)) return []
  const content = readFileSync(filePath, "utf-8")
  const parsed = parseDotenv(content)
  return Object.keys(parsed)
}

function readEnvValues(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) return {}
  const content = readFileSync(filePath, "utf-8")
  return parseDotenv(content)
}

function compareKeys(schema: SchemaDefinition, envKeys: string[]): CheckResult {
  const schemaKeys = new Set(Object.keys(schema))
  const envKeySet = new Set(envKeys)

  return {
    missing: [...schemaKeys].filter((k) => !envKeySet.has(k)),
    unused: envKeys.filter((k) => !schemaKeys.has(k)),
    matched: [...schemaKeys].filter((k) => envKeySet.has(k)),
  }
}

function displayHumanResult(result: CheckResult, sourceName: string): void {
  process.stdout.write(`\n${header("Environment Check")}\n`)
  process.stdout.write(`${hint(`Source: ${sourceName}`)}\n`)
  process.stdout.write(`${divider()}\n`)

  if (result.missing.length === 0 && result.unused.length === 0) {
    process.stdout.write(`${success("All clear — schema and env are in sync")}\n`)
    return
  }

  if (result.missing.length > 0) {
    process.stdout.write(`${warning("Missing from env:")}\n`)
    for (const key of result.missing) {
      process.stdout.write(`  ${key}\n`)
    }
    process.stdout.write("\n")
  }

  if (result.unused.length > 0) {
    process.stdout.write(`${warning("Unused in env (not in schema):")}\n`)
    for (const key of result.unused) {
      process.stdout.write(`  ${key}\n`)
    }
    process.stdout.write("\n")
  }

  process.stdout.write(`${hint("Tip: Run `ctroenv generate` to sync .env.example")}\n`)
}

export async function checkCommand(options: CheckOptions): Promise<number> {
  const envKeys = readEnvKeys(options.source)
  const result = compareKeys(options.schema, envKeys)

  let validationErrors: readonly ValidationError[] | null = null

  if (options.strict) {
    try {
      const envValues = readEnvValues(options.source)
      defineEnv(options.schema, { source: { get: (k: string) => envValues[k] } })
    } catch (e) {
      if (e instanceof CtroEnvError) {
        validationErrors = e.errors
      }
    }
  }

  if (options.json === "json") {
    const output: Record<string, unknown> = {
      source: options.source,
      total: Object.keys(options.schema).length,
      found: result.matched.length,
      missing: result.missing,
      unused: result.unused,
      validationErrors,
      clean: result.missing.length === 0 && result.unused.length === 0 && !validationErrors,
    }
    console.log(JSON.stringify(output, null, 2))
  } else {
    displayHumanResult(result, options.source)

    if (validationErrors) {
      process.stderr.write(`${warning("Value validation errors:")}\n`)
      process.stderr.write(formatErrors(validationErrors))
    }
  }

  const hasErrors =
    result.missing.length > 0 || result.unused.length > 0 || validationErrors !== null
  return hasErrors ? ExitCode.ValidationError : ExitCode.Success
}
