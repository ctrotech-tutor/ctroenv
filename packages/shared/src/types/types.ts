export type LogLevel = "debug" | "info" | "warn" | "error"

export const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

export interface LoggerOptions {
  name?: string
  level?: LogLevel
  colors?: boolean
  stream?: { write(s: string): void; isTTY?: boolean }
}

export interface Logger {
  debug(msg: string, ...args: unknown[]): void
  info(msg: string, ...args: unknown[]): void
  warn(msg: string, ...args: unknown[]): void
  error(msg: string, ...args: unknown[]): void
  child(name: string): Logger
}
