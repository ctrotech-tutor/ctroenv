# @ctroenv/shared

[![npm version](https://img.shields.io/npm/v/@ctroenv/shared)](https://www.npmjs.com/package/@ctroenv/shared)
[![npm downloads](https://img.shields.io/npm/dw/@ctroenv/shared)](https://www.npmjs.com/package/@ctroenv/shared)
[![license](https://img.shields.io/npm/l/@ctroenv/shared)](https://github.com/ctrotech-tutor/ctroenv/blob/main/LICENSE)

Internal utilities shared across CtroEnv packages. Not intended for direct use.

## Usage

This package is re-exported through `@ctroenv/core` and other CtroEnv packages.
You should not need to install it directly.

## API

### createLogger

```ts
createLogger(options?: LoggerOptions): Logger
```

Creates a structured logger with level filtering, ANSI colorization, and child logger support.

---

Built with ❤️ as part of the [CtroEnv](https://github.com/ctrotech-tutor/ctroenv) ecosystem.
