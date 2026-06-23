# @ctroenv/shared

[![npm version](https://img.shields.io/npm/v/@ctroenv/shared)](https://www.npmjs.com/package/@ctroenv/shared)
[![npm downloads](https://img.shields.io/npm/dw/@ctroenv/shared)](https://www.npmjs.com/package/@ctroenv/shared)
[![license](https://img.shields.io/npm/l/@ctroenv/shared)](https://github.com/ctrotech-tutor/ctroenv/blob/main/LICENSE)

Internal utilities shared across CtroEnv packages. **Not intended for direct use.**

This package is re-exported through `@ctroenv/core` and other CtroEnv packages. You should not need to install it directly.

## API

### `createLogger`

```ts
createLogger(options?: LoggerOptions): Logger
```

Creates a structured logger with level filtering, ANSI colorization, and child logger support.

```ts
import { createLogger } from "@ctroenv/shared"

const logger = createLogger({ level: "info" })
logger.info("Server starting on port %d", 3000)
logger.debug("Only shown when level is 'debug'") // filtered at info level

// Child logger with inherited options
const db = logger.child("db")
db.warn("Connection pool exhausted")
```

### Options

```ts
interface LoggerOptions {
  name?: string                          // Optional prefix label
  level?: LogLevel                       // "debug" | "info" | "warn" | "error" (default: "info")
  colors?: boolean                       // Enable ANSI color output (default: auto from TTY)
  stream?: { write(s: string): void; isTTY?: boolean }  // Output stream (default: stderr)
}

type LogLevel = "debug" | "info" | "warn" | "error"
```

### Methods

| Method | Description |
|--------|-------------|
| `debug(msg, ...args)` | Debug-level log (filtered unless level is `"debug"`) |
| `info(msg, ...args)` | Info-level log |
| `warn(msg, ...args)` | Warning-level log |
| `error(msg, ...args)` | Error-level log |
| `child(name)` | Create child logger with inherited context (`name` is appended to parent name with `:`) |

### Formatters

```ts
import { colorize, formatLevel } from "@ctroenv/shared"

colorize("text", "cyan", true)     // ANSI-colorized string
formatLevel("info", true)          // "INFO" with level-appropriate color
```

`colorize(text, color, enabled)` applies ANSI color codes when `enabled` is true. Colors: `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `gray`, `dim`, `reset`.

`formatLevel(level, colors)` returns the level label uppercased with level-appropriate color.

---

Built as part of the [CtroEnv](https://github.com/ctrotech-tutor/ctroenv) ecosystem.
