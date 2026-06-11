const COLORS: Record<string, number> = {
  reset: 0,
  dim: 2,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  gray: 90,
}

export function colorize(text: string, color: string, enabled: boolean): string {
  if (!enabled) return text
  const code = COLORS[color]
  if (code === undefined) return text
  return `\x1b[${code}m${text}\x1b[0m`
}

export const LEVEL_LABELS: Record<string, string> = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
}

export const LEVEL_COLORS: Record<string, string> = {
  debug: "gray",
  info: "blue",
  warn: "yellow",
  error: "red",
}

export function formatPrefix(name: string | undefined, colors: boolean): string {
  const parts: string[] = []
  if (name) {
    parts.push(colorize(name, "cyan", colors))
  }
  const prefix = parts.join(" ")
  return prefix ? `${prefix} ` : ""
}

export function formatLevel(level: string, colors: boolean): string {
  const label = LEVEL_LABELS[level] ?? level
  const col = LEVEL_COLORS[level] ?? "dim"
  return colorize(label.toUpperCase(), col, colors)
}
