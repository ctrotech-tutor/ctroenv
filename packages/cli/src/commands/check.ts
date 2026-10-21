import { existsSync, readFileSync } from "node:fs"
import type { SchemaDefinition } from "@ctroenv/core"
import { CtroEnvError, defineEnv, formatErrors, type ValidationError } from "@ctroenv/core"
import { parse as parseDotenv } from "dotenv"
import { ExitCode } from "../exit-codes"
import type { Format } from "../types"
import { suggestKey } from "../utils/levenshtein"
import { divider, header, hint, success, warning } from "../utils/output"

interface CheckOptions {
  schema: SchemaDefinition
  source: string
  example?: string
  json: Format
  strict?: boolean
  warnUnknown?: boolean
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

function readExampleKeys(filePath: string): string[] {
  if (!existsSync(filePath)) return []
  const content = readFileSync(filePath, "utf-8")
  const keys = new Set<string>(Object.keys(parseDotenv(content)))
  // `generate` comments out secrets and required-without-default vars
  // (`# KEY=`), so a complete example also declares keys in comments. Only
  // full-line `# KEY=` shapes count — descriptive prose never matches.
  for (const match of content.matchAll(/^\s*#\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) {
    const key = match[1]
    if (key) keys.add(key)
  }
  return [...keys]
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

interface DisplayLabels {
  title: string
  sourceName: string
  missing: string
  unused: string
  allClear: string
}

function displayHumanResult(result: CheckResult, labels: DisplayLabels): void {
  process.stdout.write(`\n${header(labels.title)}\n`)
  process.stdout.write(`${hint(`Source: ${labels.sourceName}`)}\n`)
  process.stdout.write(`${divider()}\n`)

  if (result.missing.length === 0 && result.unused.length === 0) {
    process.stdout.write(`${success(labels.allClear)}\n`)
    return
  }

  if (result.missing.length > 0) {
    process.stdout.write(`${warning(labels.missing)}\n`)
    for (const key of result.missing) {
      process.stdout.write(`  ${key}\n`)
    }
    process.stdout.write("\n")
  }

  if (result.unused.length > 0) {
    process.stdout.write(`${warning(labels.unused)}\n`)
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
  // The example check is keys-only by design: example values are placeholders,
  // so --strict value validation and --warn-unknown suggestions never apply.
  const exampleResult = options.example
    ? compareKeys(options.schema, readExampleKeys(options.example))
    : null
  const exampleClean =
    exampleResult === null ||
    (exampleResult.missing.length === 0 && exampleResult.unused.length === 0)

  let validationErrors: readonly ValidationError[] | null = null
  let unknownSuggestions: Array<{ key: string; suggestion: string | null }> = []

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

  if (options.warnUnknown && result.unused.length > 0) {
    const schemaKeys = Object.keys(options.schema)
    unknownSuggestions = result.unused.map((key) => ({
      key,
      suggestion: suggestKey(key, schemaKeys),
    }))
  }

  if (options.json === "json") {
    const output: Record<string, unknown> = {
      source: options.source,
      total: Object.keys(options.schema).length,
      clean:
        result.missing.length === 0 &&
        result.unused.length === 0 &&
        !validationErrors &&
        exampleClean,
      example: exampleResult
        ? {
            file: options.example,
            missing: exampleResult.missing,
            unknown: exampleResult.unused,
            matched: exampleResult.matched,
            clean: exampleResult.missing.length === 0 && exampleResult.unused.length === 0,
          }
        : null,
      summary: {
        missing: result.missing.length,
        unused: result.unused.length,
        matched: result.matched.length,
      },
      found: result.matched.length,
      missing: result.missing,
      unused: result.unused,
      matched: result.matched,
      validationErrors,
      unknownSuggestions,
    }
    console.log(JSON.stringify(output, null, 2))
  } else {
    displayHumanResult(result, {
      title: "Environment Check",
      sourceName: options.source,
      missing: "Missing from env:",
      unused: "Unused in env (not in schema):",
      allClear: "All clear — schema and env are in sync",
    })

    if (exampleResult && options.example) {
      displayHumanResult(exampleResult, {
        title: "Example Check",
        sourceName: options.example,
        missing: "Missing from example:",
        unused: "Unknown in example (not in schema):",
        allClear: "All clear — schema and example are in sync",
      })
    }

    if (unknownSuggestions.length > 0) {
      process.stdout.write(`\n${warning("Unknown env vars found in source (not in schema):")}\n`)
      for (const { key, suggestion } of unknownSuggestions) {
        const msg = suggestion ? `${key} (no match — did you mean ${suggestion}?)` : key
        process.stdout.write(`  ${msg}\n`)
      }
      process.stdout.write("\n")
    }

    if (validationErrors) {
      process.stderr.write(`${warning("Value validation errors:")}\n`)
      process.stderr.write(formatErrors(validationErrors))
    }
  }

  const hasErrors =
    result.missing.length > 0 ||
    result.unused.length > 0 ||
    validationErrors !== null ||
    !exampleClean
  return hasErrors ? ExitCode.ValidationError : ExitCode.Success
}
