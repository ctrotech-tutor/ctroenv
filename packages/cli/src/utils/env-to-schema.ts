import { existsSync, readFileSync } from "node:fs"

interface EnvVar {
  key: string
  value: string
  comment: string | null
}

function inferType(value: string): string {
  const numRegex = /^[+-]?\d+(\.\d+)?$/
  const boolRegex = /^(true|false|yes|no|on|off|1|0)$/i

  if (numRegex.test(value)) return "number()"
  if (boolRegex.test(value)) return "boolean()"
  return "string()"
}

function parseEnvFile(filePath: string): { vars: EnvVar[]; errors: string[] } {
  const vars: EnvVar[] = []
  const errors: string[] = []

  if (!existsSync(filePath)) {
    return { vars, errors: [`File not found: ${filePath}`] }
  }

  const content = readFileSync(filePath, "utf-8")
  const lines = content.replace(/\r\n/g, "\n").split("\n")
  let lastComment: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string
    const trimmed = line.trim()

    if (trimmed === "") {
      lastComment = null
      continue
    }

    if (trimmed.startsWith("#")) {
      const text = trimmed.replace(/^#\s*/, "")
      if (text) lastComment = text
      continue
    }

    const eqIndex = trimmed.indexOf("=")
    if (eqIndex === -1) {
      errors.push(`Line ${i + 1}: no "=" found in "${trimmed.slice(0, 40)}"`)
      continue
    }

    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()

    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    if (key) {
      vars.push({ key, value, comment: lastComment })
    }
    lastComment = null
  }

  return { vars, errors }
}

function isReservedWord(word: string): boolean {
  const reserved = new Set([
    "break", "case", "catch", "class", "const", "continue", "debugger",
    "default", "delete", "do", "else", "export", "extends", "false",
    "finally", "for", "function", "if", "import", "in", "instanceof",
    "new", "null", "return", "super", "switch", "this", "throw", "true",
    "try", "typeof", "var", "void", "while", "with",
  ])
  return reserved.has(word)
}

function sanitizeKey(key: string): string {
  if (isReservedWord(key)) return `"${key}"`
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) return key
  return `"${key}"`
}

export function generateSchemaFromEnv(envPath: string): {
  code: string
  fileCount: number
  errors: string[]
} {
  const { vars, errors } = parseEnvFile(envPath)

  if (vars.length === 0 && errors.length === 0) {
    return { code: "", fileCount: 0, errors: ["No environment variables found in file"] }
  }

  const lines: string[] = []
  lines.push('import { defineEnv, string, number, boolean } from "@ctroenv/core"')
  lines.push("")
  lines.push("export const env = defineEnv({")

  for (const v of vars) {
    if (v.comment) {
      lines.push(`  // ${v.comment}`)
    }

    const typeStr = v.value ? inferType(v.value) : "string()"
    const keyStr = sanitizeKey(v.key)
    lines.push(`  ${keyStr}: ${typeStr},`)
  }

  lines.push("})")
  lines.push("")

  return { code: lines.join("\n"), fileCount: vars.length, errors }
}
