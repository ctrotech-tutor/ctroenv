import type { ValidationError } from "./validation-error"

export function hasColors(): boolean {
  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== "") return false
  if (process.env.CI !== undefined) return false
  if (process.env.TERM === "dumb") return false
  return true
}

function style(text: string, codes: number[], useColors: boolean): string {
  if (!useColors) return text
  const open = codes.map((c) => `\x1b[${c}m`).join("")
  const close = "\x1b[0m"
  return `${open}${text}${close}`
}

const dim = (t: string, c: boolean) => style(t, [2], c)
const red = (t: string, c: boolean) => style(t, [31], c)
const yellow = (t: string, c: boolean) => style(t, [33], c)
const cyan = (t: string, c: boolean) => style(t, [36], c)

export function formatErrors(errors: readonly ValidationError[]): string {
  const useColors = hasColors()
  const missing = errors.filter((e) => e.code === "missing_required")
  const invalid = errors.filter((e) => e.code !== "missing_required")

  const lines: string[] = []

  lines.push("")

  if (missing.length > 0) {
    lines.push(
      red(style(" ●", [1], useColors), useColors) +
        ` ${red(`Missing required (${missing.length})`, useColors)}`,
    )
    lines.push("")
    for (const err of missing) {
      const desc = err.suggestion ? dim(err.suggestion, useColors) : ""
      lines.push(`   ${yellow(err.key, useColors)}${desc ? `  ${desc}` : ""}`)
    }
    lines.push("")
  }

  if (invalid.length > 0) {
    lines.push(
      yellow(style(" ✗", [1], useColors), useColors) +
        ` ${yellow(`Invalid (${invalid.length})`, useColors)}`,
    )
    lines.push("")
    for (const err of invalid) {
      lines.push(`   ${yellow(err.key, useColors)}`)
      lines.push(`   ${err.message}`)
      if (err.suggestion) {
        lines.push(`   ${cyan("→", useColors)} ${cyan(err.suggestion, useColors)}`)
      }
    }
    lines.push("")
  }

  lines.push(` ${cyan("→", useColors)} ${dim("Define once. Trust everywhere.", useColors)}`)
  lines.push("")

  return lines.join("\n")
}
