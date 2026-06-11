import type { ValidationError } from "./validation-error"

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
}

function colorize(text: string, color: keyof typeof colors): string {
  const code = colors[color]
  return `${code}${text}${colors.reset}`
}

export function formatErrors(errors: readonly ValidationError[]): string {
  const missing = errors.filter((e) => e.code === "missing_required")
  const invalid = errors.filter((e) => e.code !== "missing_required")

  const lines: string[] = []

  lines.push("")
  lines.push(colorize(`  CtroEnv — ${colorize("Validation Failed", "bold")}`, "red"))
  lines.push("")

  if (missing.length > 0) {
    lines.push(colorize(`  ${colorize("●", "red")} Missing (${missing.length}):`, "red"))
    lines.push("")
    for (const err of missing) {
      const desc = err.suggestion ? colorize(`  ${err.suggestion}`, "dim") : ""
      lines.push(`    ${colorize(err.key, "yellow")}${desc ? `  ${desc}` : ""}`)
    }
    lines.push("")
  }

  if (invalid.length > 0) {
    lines.push(colorize(`  ${colorize("✗", "yellow")} Invalid (${invalid.length}):`, "yellow"))
    lines.push("")
    for (const err of invalid) {
      lines.push(`    ${colorize(err.key, "yellow")}`)
      lines.push(`    ${err.message}`)
      if (err.suggestion) {
        lines.push(colorize(`    ${colorize("→", "cyan")} ${err.suggestion}`, "cyan"))
      }
    }
    lines.push("")
  }

  lines.push(colorize(`  ${colorize("→", "cyan")} Define once. Trust everywhere.`, "cyan"))
  lines.push("")

  return lines.join("\n")
}
