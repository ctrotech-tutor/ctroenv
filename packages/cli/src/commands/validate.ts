import { readFileSync } from "node:fs"
import { CtroEnvError, defineEnv, formatErrors, type SchemaDefinition } from "@ctroenv/core"
import { watch } from "chokidar"
import { parse as parseDotenv } from "dotenv"
import { ExitCode } from "../exit-codes"
import type { Format } from "../types"
import { cliLogger } from "../utils/logger"
import { createSpinner, divider, error, header, hint, keyValueTable } from "../utils/output"

interface ValidateOptions {
  schema: SchemaDefinition
  source?: string
  strict: boolean
  watch: boolean
  json: Format
}

function getSource(sourcePath?: string): Record<string, string | undefined> | undefined {
  if (!sourcePath) return undefined
  const content = readFileSync(sourcePath, "utf-8")
  return parseDotenv(content)
}

function displaySuccessTable(
  schema: SchemaDefinition,
  env: Record<string, unknown>,
  sourceName: string,
): void {
  const rows: [string, string][] = []
  for (const [key, validator] of Object.entries(schema)) {
    const value = env[key]
    const meta = validator.metadata
    let displayValue: string

    if (meta.isSecret) {
      displayValue = hint("••••••••")
    } else if (value === undefined) {
      displayValue = hint("undefined")
    } else if (meta.hasDefault && env[key] === meta.defaultValue) {
      displayValue = `default: ${String(meta.defaultValue)}`
    } else {
      displayValue = String(value)
    }

    rows.push([key, displayValue])
  }

  process.stdout.write(`\n${header(`✓ All ${rows.length} variables valid`)}\n`)
  process.stdout.write(`${hint(`Source: ${sourceName}`)}\n`)
  process.stdout.write(`${divider()}\n`)
  process.stdout.write(`${keyValueTable(rows)}\n`)
  process.stdout.write(`${divider()}\n`)
}

function displayJsonResult(
  schema: SchemaDefinition,
  env: Record<string, unknown>,
  errors: readonly unknown[],
  sourceName: string,
): void {
  const variables = Object.entries(schema).map(([key, validator]) => {
    const meta = validator.metadata
    return {
      key,
      type: meta.typeLabel,
      value: env[key],
      required: !meta.optional && !meta.hasDefault,
      description: meta.description,
      isSecret: meta.isSecret,
      hasDefault: meta.hasDefault,
      defaultValue: meta.defaultValue,
    }
  })

  const result = {
    valid: errors.length === 0,
    source: sourceName,
    total: Object.keys(schema).length,
    errors: errors.length,
    variables,
  }

  console.log(JSON.stringify(result, null, 2))
}

async function runValidation(
  options: ValidateOptions,
  sourcePath: string | undefined,
  sourceName: string,
): Promise<number> {
  const spinner = createSpinner("Validating...")
  spinner.start()

  try {
    const source = getSource(sourcePath)
    const env = defineEnv(options.schema, source ? { source } : undefined)
    spinner.stop()

    if (options.json === "json") {
      displayJsonResult(options.schema, env, [], sourceName)
    } else {
      displaySuccessTable(options.schema, env, sourceName)
    }

    return ExitCode.Success
  } catch (e) {
    spinner.stop()

    if (e instanceof CtroEnvError) {
      if (options.json === "json") {
        displayJsonResult(options.schema, {}, e.errors, sourceName)
      } else {
        process.stdout.write(formatErrors(e.errors))
        process.stdout.write(`\n${hint("Fix the errors above and re-run.")}\n`)
      }
      return ExitCode.ValidationError
    }

    process.stdout.write(`${error("Validation failed unexpectedly:")}\n`)
    console.error(e)
    return ExitCode.ConfigError
  }
}

export async function validateCommand(options: ValidateOptions): Promise<number> {
  const sourceName = options.source ?? "process.env"

  if (options.watch) {
    const paths = [process.cwd()]
    const watcher = watch(paths, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300 },
    })

    let result = await runValidation(options, options.source, sourceName)

    watcher.on("change", async (changedPath) => {
      process.stdout.write("\n")
      cliLogger.info(`Change detected: ${changedPath}`)
      result = await runValidation(options, options.source, sourceName)
    })

    watcher.on("error", (err) => {
      cliLogger.error("Watch error:", err)
    })

    process.on("SIGINT", () => {
      watcher.close().then(() => process.exit(0))
    })

    return result
  }

  return runValidation(options, options.source, sourceName)
}
