import { colorize, formatLevel, formatPrefix } from "./formatters"
import type { Logger, LoggerOptions, LogLevel } from "./types"
import { LOG_LEVELS } from "./types"

export function createLogger(options?: LoggerOptions): Logger {
  const {
    name,
    level = "info",
    stream = process.stderr,
    colors = stream.isTTY ?? false,
  } = options ?? {}

  function log(levelName: LogLevel, msg: string, args: unknown[]): void {
    const min = LOG_LEVELS[level]
    const current = LOG_LEVELS[levelName]
    if (current < min) return

    const parts: string[] = []
    parts.push(colorize("›", "dim", colors))
    parts.push(formatLevel(levelName, colors))
    parts.push(formatPrefix(name, colors))
    parts.push(msg)

    if (args.length > 0) {
      parts.push(
        args
          .map((a) => {
            if (typeof a === "object" && a !== null) {
              return `\n${JSON.stringify(a, null, 2)}`
            }
            return ` ${a}`
          })
          .join(""),
      )
    }

    stream.write(`${parts.join(" ")}\n`)
  }

  return {
    debug(msg, ...args) {
      log("debug", msg, args)
    },
    info(msg, ...args) {
      log("info", msg, args)
    },
    warn(msg, ...args) {
      log("warn", msg, args)
    },
    error(msg, ...args) {
      log("error", msg, args)
    },
    child(childName: string): Logger {
      const fullName = name ? `${name}:${childName}` : childName
      return createLogger({ name: fullName, level, colors, stream })
    },
  }
}
