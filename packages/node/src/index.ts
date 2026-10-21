import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { EnvSource } from "@ctroenv/core"

export type { EnvSource }

export interface LoadEnvOptions {
  path?: string
  encoding?: BufferEncoding
  override?: boolean
  system?: boolean
  native?: boolean
}

export function nodeSource(): EnvSource {
  return {
    get(key: string): string | undefined {
      return process.env[key]
    },
  }
}

/**
 * Parse a raw `.env` file string into key-value pairs.
 *
 * The grammar intentionally matches `dotenv` so files behave identically
 * whether they are read here, by the CLI, or by Vite:
 *
 * - Keys must match `[\w.-]+`; anything else is skipped.
 * - Separators are `=` (surrounding spaces allowed) or `:` followed by
 *   whitespace. `KEY:val` (no space) and `KEY : val` do not parse.
 * - `#` starts a comment in unquoted values — even without a preceding space.
 *   Quote values that contain `#` (e.g. `SECRET="pass#123"`).
 * - Double-quoted values may span lines; `\n` and `\r` sequences expand.
 * - Single-quoted and backtick-quoted values are literal (and may span lines).
 *
 * CtroEnv extensions beyond `dotenv` (all documented in the README):
 * variable interpolation (`$VAR`, `${VAR}`, `$$` escape), trailing-`\`
 * continuations for unquoted values, and `\"` unescaping in double quotes.
 */
export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {}
  content = content.replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "")
  const lines = content.split("\n")

  let index = 0
  while (index < lines.length) {
    const line = (lines[index] as string).trim()
    index += 1

    if (!line || line.startsWith("#")) continue

    const entry = splitEntry(line.replace(EXPORT_PREFIX, ""))
    if (!entry) continue

    const read = readEntryValue(lines, index - 1, entry.rest)
    index = read.nextIndex
    if (read.value !== undefined) {
      result[entry.key] = interpolate(read.value, result)
    }
  }

  return result
}

const VALID_KEY = /^[\w.-]+$/
const EXPORT_PREFIX = /^export\s+/
const COLON_SEPARATOR = /^([\w.-]+):\s+/
const TRAILING_COMMENT = /^\s*(#.*)?$/

type QuoteChar = '"' | "'" | "`"

function isQuoteChar(char: string | undefined): char is QuoteChar {
  return char === '"' || char === "'" || char === "`"
}

function splitEntry(line: string): { key: string; rest: string } | undefined {
  const eq = line.indexOf("=")
  if (eq !== -1) {
    const key = line.slice(0, eq).trim()
    if (VALID_KEY.test(key)) {
      return { key, rest: line.slice(eq + 1) }
    }
  }
  const colon = COLON_SEPARATOR.exec(line)
  if (colon?.[1]) {
    return { key: colon[1], rest: line.slice(colon[0].length) }
  }
  return undefined
}

/** Index of the closing quote, honouring `\` escapes; -1 when there is none. */
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

function processQuoted(content: string, quote: QuoteChar): string {
  if (quote !== '"') {
    // Single-quoted and backtick-quoted values are fully literal.
    return content
  }
  return (
    content
      // CtroEnv deviation from dotenv (which keeps `\"` literal): unescape
      // quotes, matching shell, Python, and Ruby dotenv behaviour.
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
  )
}

function processUnquoted(rest: string): string {
  const hash = rest.indexOf("#")
  return (hash === -1 ? rest : rest.slice(0, hash)).trim()
}

/**
 * dotenv's recovery for a malformed quoted line: after the unquoted fallback,
 * one surrounding quote pair is still stripped when present, and `\n` / `\r`
 * still expand when the value starts with `"`. Kept byte-exact with dotenv —
 * the `\"` deviation applies only to well-formed double-quoted values.
 */
function recoverUnquoted(rest: string): string {
  const trimmed = processUnquoted(rest)
  const maybeQuote = trimmed[0]
  let value = trimmed
  if (value.length >= 2 && isQuoteChar(maybeQuote) && value.endsWith(maybeQuote)) {
    value = value.slice(1, -1)
  }
  if (maybeQuote === '"') {
    value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r")
  }
  return value
}

interface ReadValue {
  /** `undefined` means the entry is dropped (dangling continuation at EOF). */
  value: string | undefined
  nextIndex: number
}

function readQuotedValue(
  lines: string[],
  lineIndex: number,
  lead: string,
  quote: QuoteChar,
): ReadValue {
  const close = closingQuoteIndex(lead, quote, 1)
  if (close !== -1) {
    // Closing quote on the same line: anything after it must be blank or a
    // comment, otherwise the line falls back to unquoted handling (dotenv).
    if (TRAILING_COMMENT.test(lead.slice(close + 1))) {
      return {
        value: processQuoted(lead.slice(1, close), quote),
        nextIndex: lineIndex + 1,
      }
    }
    return { value: recoverUnquoted(lead), nextIndex: lineIndex + 1 }
  }

  const parts = [lead]
  let cursor = lineIndex + 1
  while (cursor < lines.length) {
    const nextLine = lines[cursor] as string
    const closeAt = closingQuoteIndex(nextLine, quote, 0)
    if (closeAt === -1) {
      parts.push(nextLine)
      cursor += 1
      continue
    }
    if (!TRAILING_COMMENT.test(nextLine.slice(closeAt + 1))) {
      // Junk after the closing quote: fall back to the first line, unquoted.
      return { value: recoverUnquoted(lead), nextIndex: lineIndex + 1 }
    }
    parts.push(nextLine.slice(0, closeAt))
    return {
      value: processQuoted(parts.join("\n").slice(1), quote),
      nextIndex: cursor + 1,
    }
  }

  // Never closed: dotenv keeps the first line as an unquoted value.
  return { value: recoverUnquoted(lead), nextIndex: lineIndex + 1 }
}

function readUnquotedValue(lines: string[], lineIndex: number, rest: string): ReadValue {
  const first = rest.trim()
  if (!first.endsWith("\\")) {
    return { value: processUnquoted(rest), nextIndex: lineIndex + 1 }
  }

  // Trailing-`\` continuation (ctroenv extension): following lines are joined
  // verbatim until one does not end with `\`.
  const parts = [first.slice(0, -1).trimEnd()]
  let cursor = lineIndex + 1
  while (cursor < lines.length) {
    const nextLine = (lines[cursor] as string).trim()
    if (nextLine.endsWith("\\")) {
      parts.push(nextLine.slice(0, -1).trimEnd())
      cursor += 1
      continue
    }
    parts.push(nextLine)
    return { value: processUnquoted(parts.join("\n")), nextIndex: cursor + 1 }
  }
  return { value: undefined, nextIndex: cursor }
}

function readEntryValue(lines: string[], lineIndex: number, rest: string): ReadValue {
  const lead = rest.trimStart()
  if (isQuoteChar(lead[0])) {
    return readQuotedValue(lines, lineIndex, lead, lead[0])
  }
  return readUnquotedValue(lines, lineIndex, rest)
}

function interpolate(value: string, env: Record<string, string>): string {
  const SENTINEL = "\x00"
  return value
    .replace(/\$\$/g, SENTINEL)
    .replace(/\$\{(\w+)\}|\$(\w+)/g, (match, brace, simple) => {
      const name = brace ?? simple ?? ""
      if (name in env) return env[name] as string
      if (process.env[name] !== undefined) return process.env[name] as string
      return match
    })
    .split(SENTINEL)
    .join("$")
}

const ENV_FILES = [".env", `.env.${process.env.NODE_ENV ?? "development"}`, ".env.local"]

function resolveFiles(root: string): string[] {
  return ENV_FILES.map((f) => join(root, f))
}

export function loadEnv(opts?: LoadEnvOptions): EnvSource {
  const root = opts?.path ?? process.cwd()
  const encoding = opts?.encoding ?? "utf-8"
  const env: Record<string, string> = {}

  if (opts?.native && typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(root)
      return nodeSource()
    } catch {
      // Fall through to custom parsing
    }
  }

  for (const filePath of resolveFiles(root)) {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, encoding)
      const parsed = parseEnvFile(content)
      Object.assign(env, parsed)
    }
  }

  return {
    get(key: string): string | undefined {
      if (!opts?.override && process.env[key] !== undefined) {
        return process.env[key]
      }
      if (key in env) return env[key]
      if (opts?.system) return process.env[key]
      return undefined
    },
  }
}
