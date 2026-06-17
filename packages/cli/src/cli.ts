#!/usr/bin/env node
import { readFileSync } from "node:fs"
import type { SchemaDefinition } from "@ctroenv/core"
import { Command } from "commander"
import { checkCommand } from "./commands/check"
import { docsCommand } from "./commands/docs"
import { generateCommand } from "./commands/generate"
import { initCommand } from "./commands/init"
import { validateCommand } from "./commands/validate"
import { ExitCode } from "./exit-codes"
import type { ResolvedConfig } from "./types"
import { findSchema, loadSchema, resolveConfig } from "./utils"
import { error as errorMsg, hint } from "./utils/output"

if (process.env.NO_COLOR === "") {
  process.env.NO_COLOR = "1"
}

function getVersion(): string {
  try {
    const url = new URL("../package.json", import.meta.url)
    const pkg = JSON.parse(readFileSync(url, "utf-8"))
    return pkg.version
  } catch {
    return "0.0.0"
  }
}

async function setupCommand(
  commandFn: (
    schema: SchemaDefinition,
    config: ResolvedConfig,
    schemaPath: string,
  ) => Promise<number>,
  opts: Record<string, unknown>,
): Promise<void> {
  try {
    const cwd = process.cwd()
    const config = resolveConfig(cwd, { schema: opts.schema as string | undefined })
    const schemaPath = findSchema(cwd, config.schema)
    if (!schemaPath) {
      process.stderr.write(
        `${errorMsg("Could not find schema file.")}\n${hint("Create src/env.ts or run: ctroenv init")}\n`,
      )
      process.exit(ExitCode.ConfigError)
    }
    process.stderr.write(`${hint(`Schema: ${schemaPath}`)}\n`)

    const schema = await loadSchema(schemaPath)
    const exitCode = await commandFn(schema, config, schemaPath)
    process.exit(exitCode)
  } catch (e) {
    process.stderr.write(`${errorMsg("Unexpected error:")}\n`)
    console.error(e)
    process.exit(ExitCode.ConfigError)
  }
}

const program = new Command()
  .name("ctroenv")
  .description("Environment variable management toolkit")
  .version(getVersion())
  .option("--no-color", "Disable colored output")
  .hook("preAction", (thisCommand) => {
    if (!thisCommand.opts().color) process.env.NO_COLOR = "1"
  })

program
  .command("init")
  .description("Scaffold a ctroenv config file")
  .option("--ts", "Generate TypeScript config (default)")
  .option("--js", "Generate JavaScript config")
  .option("--json", "Generate JSON config")
  .option("--minimal", "Generate minimal config")
  .action(async (opts) => {
    const format = opts.json ? "json" : opts.js ? "js" : "ts"
    const exitCode = await initCommand({
      format,
      minimal: !!opts.minimal,
      cwd: process.cwd(),
    })
    process.exit(exitCode)
  })

program
  .command("validate")
  .description("Validate environment variables against schema")
  .option("--source <path>", "Source env file (default: process.env or config sources.default)")
  .option("--watch", "Watch for changes and re-validate")
  .option("--json", "Output JSON instead of formatted text")
  .action(async (opts) => {
    await setupCommand(async (schema, config, schemaPath) => {
      return validateCommand({
        schema,
        source: opts.source ?? config.sources?.default,
        watch: !!opts.watch,
        schemaPath,
        json: opts.json ? "json" : "text",
        secrets: config.secrets,
      })
    }, opts)
  })

program
  .command("generate")
  .description("Generate .env.example from schema")
  .option("--output <path>", "Output file path", ".env.example")
  .option("--no-comments", "Generate minimal output without comments")
  .action(async (opts) => {
    await setupCommand(async (schema, _config, _schemaPath) => {
      return generateCommand({
        schema,
        output: opts.output,
        noComments: !opts.comments,
      })
    }, opts)
  })
program
  .command("check")
  .description("Compare .env against schema")
  .option("--source <path>", "Source env file to check")
  .option("--strict", "Also validate values against schema")
  .option("--json", "Output JSON instead of formatted text")
  .action(async (opts) => {
    await setupCommand(async (schema, config, _schemaPath) => {
      return checkCommand({
        schema,
        source: opts.source ?? config.sources?.default ?? ".env",
        strict: !!opts.strict,
        json: opts.json ? "json" : "text",
      })
    }, opts)
  })
program
  .command("docs")
  .description("Generate documentation from schema")
  .option("--output <path>", "Output file path", "ENVIRONMENT.md")
  .option("--format <format>", "Output format: markdown|json", "markdown")
  .action(async (opts) => {
    await setupCommand(async (schema, _config, _schemaPath) => {
      return docsCommand({
        schema,
        output: opts.output,
        format: opts.format,
      })
    }, opts)
  })
program.parse()
