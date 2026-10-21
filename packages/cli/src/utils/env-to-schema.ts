import { existsSync, readFileSync } from "node:fs"
import { parse as parseDotenv } from "dotenv"

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

  const content = readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n")
  // Keys and values come from dotenv — the same parser `validate` and `check`
  // use — so scaffolding agrees with every other CLI command on quoting,
  // escapes, multiline values, `export ` prefixes, and `#` comments.
  const parsed = parseDotenv(content)
  const keys = new Set(Object.keys(parsed))

  // Second pass over the raw lines, purely for `#` comment attachment and
  // malformed-line errors. It never affects keys or values: those are
  // dotenv's. Multiline quoted spans are skipped so `#` lines inside values
  // are not mistaken for comments and continuations are not flagged.
  const comments = new Map<string, string>()
  const lines = content.split("\n")
  let pending: string | null = null
  let skipUntil = 0

  for (let i = 0; i < lines.length; i++) {
    if (i < skipUntil) continue
    const trimmed = (lines[i] as string).trim()

    if (trimmed === "") {
      pending = null
      continue
    }

    if (trimmed.startsWith("#")) {
      const text = trimmed.replace(/^#\s*/, "")
      if (text) pending = text
      continue
    }

    const entry = splitEntryLine(trimmed)
    if (entry !== undefined && keys.has(entry.key)) {
      // Last comment wins for duplicate keys, matching dotenv's last-wins values.
      if (pending !== null) comments.set(entry.key, pending)
      pending = null
      skipUntil = multilineEnd(lines, i, entry.rest)
      continue
    }

    if (!trimmed.includes("=")) {
      errors.push(`Line ${i + 1}: no "=" found in "${trimmed.slice(0, 40)}"`)
    }
    // Lines dotenv skips (e.g. invalid keys) stay silent, as in validate/check.
  }

  for (const [key, value] of Object.entries(parsed)) {
    vars.push({ key, value, comment: comments.get(key) ?? null })
  }

  return { vars, errors }
}

const VALID_KEY = /^[\w.-]+$/
const EXPORT_PREFIX = /^export\s+/
const COLON_SEPARATOR = /^([\w.-]+):\s/

type QuoteChar = '"' | "'" | "`"

function isQuoteChar(char: string | undefined): char is QuoteChar {
  return char === '"' || char === "'" || char === "`"
}

/**
 * Candidate key and value rest for a logical line, or undefined when the line
 * is not an entry. Mirrors dotenv's `=` / `: ` separators and `export `
 * prefix; callers intersect with dotenv's parsed keys so invalid keys and
 * dotenv quirks stay dropped.
 */
function splitEntryLine(line: string): { key: string; rest: string } | undefined {
  const stripped = line.replace(EXPORT_PREFIX, "")
  const eq = stripped.indexOf("=")
  if (eq !== -1) {
    const key = stripped.slice(0, eq).trim()
    if (!VALID_KEY.test(key)) return undefined
    return { key, rest: stripped.slice(eq + 1) }
  }
  const colon = COLON_SEPARATOR.exec(stripped)
  if (colon?.[1]) {
    return { key: colon[1], rest: stripped.slice(colon[0].length) }
  }
  return undefined
}

/** Index of the closing quote at or after `from`, honouring `\` escapes; -1 when none. */
function closingQuoteIndex(text: string, quote: QuoteChar, from: number): number {
  let i = from
  while (i < text.length) {
    if (text[i] === "\\") {
      i += 2
      continue
    }
    if (text[i] === quote) return i
    i += 1
  }
  return -1
}

/**
 * First line index after the quoted span starting on `start`, or `start + 1`
 * when the value is single-line. Only spans whose closing quote exists are
 * skipped: dotenv keeps unterminated quotes literal on their own line.
 */
function multilineEnd(lines: string[], start: number, rest: string): number {
  const value = rest.trimStart()
  const quote = value[0]
  if (!isQuoteChar(quote)) return start + 1
  if (closingQuoteIndex(value, quote, 1) !== -1) return start + 1
  for (let j = start + 1; j < lines.length; j++) {
    if (closingQuoteIndex(lines[j] as string, quote, 0) !== -1) return j + 1
  }
  return start + 1
}

function isReservedWord(word: string): boolean {
  const reserved = new Set([
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "else",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "function",
    "if",
    "import",
    "in",
    "instanceof",
    "new",
    "null",
    "return",
    "super",
    "switch",
    "this",
    "throw",
    "true",
    "try",
    "typeof",
    "var",
    "void",
    "while",
    "with",
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

  // The stub exports only the schema object — never a defineEnv() result —
  // so it stays importable with any (even empty) environment.
  const entries: string[] = []
  const usedValidators = new Set<string>()

  for (const v of vars) {
    if (v.comment) {
      entries.push(`  // ${v.comment}`)
    }

    const typeStr = v.value ? inferType(v.value) : "string()"
    usedValidators.add(typeStr.slice(0, -2))
    const keyStr = sanitizeKey(v.key)
    entries.push(`  ${keyStr}: ${typeStr},`)
  }

  const lines: string[] = []
  lines.push(`import { ${[...usedValidators].sort().join(", ")} } from "@ctroenv/core"`)
  lines.push("")
  lines.push("export const schema = {")
  lines.push(...entries)
  lines.push("}")
  lines.push("")

  return { code: lines.join("\n"), fileCount: vars.length, errors }
}
