import pc from "picocolors"

export function header(text: string): string {
  return pc.bold(pc.cyan(text))
}

export function success(text: string): string {
  return `${pc.green("✓")} ${text}`
}

export function error(text: string): string {
  return `${pc.red("✗")} ${text}`
}

export function warning(text: string): string {
  return `${pc.yellow("⚠")} ${text}`
}

export function hint(text: string): string {
  return pc.dim(text)
}

export function divider(): string {
  return pc.dim("─".repeat(50))
}

export function keyLabel(text: string): string {
  return pc.bold(pc.yellow(text))
}

export function section(title: string, lines: string[]): string {
  const body = lines.map((l) => `  ${l}`).join("\n")
  return title.length > 0 ? `${pc.bold(title)}\n${body}` : body
}

export function keyValueTable(rows: [string, string][]): string {
  if (rows.length === 0) return ""
  const maxKeyLen = Math.max(...rows.map(([k]) => k.length))
  return rows
    .map(([k, v]) => {
      return `  ${pc.bold(k)}${" ".repeat(maxKeyLen - k.length)}  ${v}`
    })
    .join("\n")
}

export interface Spinner {
  start(): void
  stop(): void
  succeed(text?: string): void
  fail(text?: string): void
}

export function createSpinner(text: string): Spinner {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
  let interval: ReturnType<typeof setInterval> | null = null
  let i = 0

  function clearLine() {
    process.stdout.write("\r\x1b[K")
  }

  return {
    start() {
      if (interval) return
      interval = setInterval(() => {
        clearLine()
        process.stdout.write(`${pc.cyan(frames[i++ % frames.length])} ${text}`)
      }, 80)
    },
    stop() {
      if (interval) {
        clearInterval(interval)
        interval = null
        clearLine()
      }
    },
    succeed(msg?: string) {
      this.stop()
      process.stdout.write(`${pc.green("✓")} ${msg ?? text}\n`)
    },
    fail(msg?: string) {
      this.stop()
      process.stdout.write(`${pc.red("✗")} ${msg ?? text}\n`)
    },
  }
}
