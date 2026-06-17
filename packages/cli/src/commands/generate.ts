import { writeFileSync } from "node:fs"
import type { SchemaDefinition } from "@ctroenv/core"
import { ExitCode } from "../exit-codes"
import { error, hint, success } from "../utils/output"

interface GenerateOptions {
  schema: SchemaDefinition
  output: string
  noComments: boolean
}

function generateEnvContent(schema: SchemaDefinition, noComments: boolean): string {
  const lines: string[] = []

  if (!noComments) {
    lines.push("# CtroEnv — Environment Variables")
    lines.push("# Generated from schema. Edit the schema, not this file.")
    lines.push("")
  }

  for (const [key, validator] of Object.entries(schema)) {
    const meta = validator.metadata

    if (!noComments) {
      if (meta.description) {
        lines.push(`# ${meta.description}`)
      }
      lines.push(`# Required: ${meta.optional ? "no" : "yes"}`)
      lines.push(`# Type: ${meta.typeLabel}`)
      if (meta.hasDefault) {
        lines.push(`# Default: ${String(meta.defaultValue)}`)
      }
      if (meta.isSecret) {
        lines.push("# (secret — do not commit this value)")
      }
    }

    if (meta.isSecret) {
      lines.push(`# ${key}=`)
    } else if (meta.hasDefault) {
      lines.push(`${key}=${String(meta.defaultValue)}`)
    } else {
      lines.push(`# ${key}=`)
    }

    lines.push("")
  }

  return lines.join("\n")
}

export async function generateCommand(options: GenerateOptions): Promise<number> {
  try {
    const content = generateEnvContent(options.schema, options.noComments)
    writeFileSync(options.output, content, "utf-8")
    process.stdout.write(`${success(`Generated ${options.output}`)}\n`)
    if (!options.noComments) {
      process.stdout.write(`${hint("Edit the schema, not this file.")}\n`)
    }
    return ExitCode.Success
  } catch (e) {
    process.stderr.write(`${error(`Could not write ${options.output}:`)}\n`)
    console.error(e)
    return ExitCode.ConfigError
  }
}
