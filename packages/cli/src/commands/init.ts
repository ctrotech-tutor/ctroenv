import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { ExitCode } from "../exit-codes"
import { generateSchemaFromEnv } from "../utils/env-to-schema"
import { divider, error, hint, success } from "../utils/output"

interface InitOptions {
  format: "ts" | "js" | "json"
  minimal: boolean
  cwd: string
  fromEnv?: string
}

const TS_FULL = `import { defineConfig } from "@ctroenv/cli"

export default defineConfig({
  schema: "./src/env.ts",
  sources: {
    default: ".env",
    production: ".production.env",
  },
  output: {
    example: ".env.example",
    docs: "ENVIRONMENT.md",
  },
  secrets: {
    mask: [],
    maskWith: "***",
  },
})
`

const TS_MINIMAL = `import { defineConfig } from "@ctroenv/cli"

export default defineConfig({
  schema: "./src/env.ts",
})
`

const JS_FULL = `// @ts-check
import { defineConfig } from "@ctroenv/cli"

/** @type {import("@ctroenv/cli").CliConfig} */
export default defineConfig({
  schema: "./src/env.ts",
  sources: {
    default: ".env",
    production: ".production.env",
  },
  output: {
    example: ".env.example",
    docs: "ENVIRONMENT.md",
  },
  secrets: {
    mask: [],
    maskWith: "***",
  },
})
`

const JS_MINIMAL = `// @ts-check
import { defineConfig } from "@ctroenv/cli"

/** @type {import("@ctroenv/cli").CliConfig} */
export default defineConfig({
  schema: "./src/env.ts",
})
`

const JSON_FULL = `${JSON.stringify(
  {
    schema: "./src/env.ts",
    sources: {
      default: ".env",
      production: ".production.env",
    },
    output: {
      example: ".env.example",
      docs: "ENVIRONMENT.md",
    },
    secrets: {
      mask: [],
      maskWith: "***",
    },
  },
  null,
  2,
)}\n`

const JSON_MINIMAL = `${JSON.stringify({ schema: "./src/env.ts" }, null, 2)}\n`

function getTemplate(format: "ts" | "js" | "json", minimal: boolean): string {
  if (format === "json") return minimal ? JSON_MINIMAL : JSON_FULL
  if (format === "ts") return minimal ? TS_MINIMAL : TS_FULL
  return minimal ? JS_MINIMAL : JS_FULL
}

export async function initCommand(options: InitOptions): Promise<number> {
  if (options.fromEnv) {
    const envPath = resolve(options.cwd, options.fromEnv)
    const { code, fileCount, errors: genErrors } = generateSchemaFromEnv(envPath)

    if (genErrors.length > 0) {
      for (const err of genErrors) {
        process.stderr.write(`${error(err)}\n`)
      }
      if (fileCount === 0) return ExitCode.ConfigError
    }

    const schemaPath = resolve(options.cwd, "src", "env.ts")
    try {
      mkdirSync(dirname(schemaPath), { recursive: true })
      writeFileSync(schemaPath, code, "utf-8")
      process.stdout.write(`${success(`src/env.ts generated from ${options.fromEnv}`)}\n`)
      if (fileCount > 0) {
        process.stdout.write(
          `${hint(`${fileCount} environment variable${fileCount === 1 ? "" : "s"} mapped to schema validators.\n`)}`,
        )
      }
      process.stdout.write(`${divider()}\n`)
      process.stdout.write(`${hint("Review the schema and adjust validator types as needed.")}\n`)
      process.stdout.write(`${hint("Then add any missing validators and run: ctroenv validate")}\n`)
    } catch (e) {
      process.stderr.write(`${error(`Could not write src/env.ts:`)}\n`)
      console.error(e)
      return ExitCode.ConfigError
    }
    return ExitCode.Success
  }

  const filename =
    options.format === "ts"
      ? "ctroenv.config.ts"
      : options.format === "js"
        ? "ctroenv.config.js"
        : "ctroenv.json"
  const filePath = resolve(options.cwd, filename)

  try {
    writeFileSync(filePath, getTemplate(options.format, options.minimal), "utf-8")
    process.stdout.write(`${success(`Created ${filename}`)}\n`)
    process.stdout.write(`${divider()}\n`)
    process.stdout.write(`${hint("Edit the config to point to your schema file.")}\n`)
    process.stdout.write(`${hint("Then run: ctroenv validate")}\n`)
    return ExitCode.Success
  } catch (e) {
    process.stderr.write(`${error(`Could not create ${filename}:`)}\n`)
    console.error(e)
    return ExitCode.ConfigError
  }
}
