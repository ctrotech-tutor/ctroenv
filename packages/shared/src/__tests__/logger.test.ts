import { describe, expect, it } from "vitest"
import { colorize, formatLevel } from "../logger/formatters"
import { createLogger } from "../logger/logger"

function makeStream() {
  let output = ""
  return {
    write(s: string) {
      output += s
    },
    toString() {
      return output
    },
  }
}

describe("createLogger()", () => {
  describe("log levels", () => {
    it("defaults to info level", () => {
      const stream = makeStream()
      const log = createLogger({ stream })
      log.debug("should not appear")
      expect(stream.toString()).toBe("")
      log.info("hello")
      expect(stream.toString()).toContain("hello")
    })

    it("respects debug level", () => {
      const stream = makeStream()
      const log = createLogger({ stream, level: "debug" })
      log.debug("debug msg")
      expect(stream.toString()).toContain("debug msg")
    })

    it("respects error level (only error and above)", () => {
      const stream = makeStream()
      const log = createLogger({ stream, level: "error" })
      log.info("info msg")
      log.warn("warn msg")
      expect(stream.toString()).toBe("")
      log.error("error msg")
      expect(stream.toString()).toContain("error msg")
    })

    it("each level method writes the correct level label", () => {
      const stream = makeStream()
      const log = createLogger({ stream, level: "debug", colors: false })
      log.debug("d")
      expect(stream.toString()).toContain("DEBUG")
    })

    it("info writes INFO label", () => {
      const stream = makeStream()
      const log = createLogger({ stream, level: "debug", colors: false })
      log.info("i")
      expect(stream.toString()).toContain("INFO")
    })

    it("warn writes WARN label", () => {
      const stream = makeStream()
      const log = createLogger({ stream, level: "debug", colors: false })
      log.warn("w")
      expect(stream.toString()).toContain("WARN")
    })

    it("error writes ERROR label", () => {
      const stream = makeStream()
      const log = createLogger({ stream, level: "debug", colors: false })
      log.error("e")
      expect(stream.toString()).toContain("ERROR")
    })
  })

  describe("formatting", () => {
    it("includes name prefix when provided", () => {
      const stream = makeStream()
      const log = createLogger({ stream, name: "test", colors: false })
      log.info("msg")
      expect(stream.toString()).toContain("test ")
    })

    it("serializes object args as JSON", () => {
      const stream = makeStream()
      const log = createLogger({ stream, level: "debug", colors: false })
      log.info("data:", { key: "value" })
      const out = stream.toString()
      expect(out).toContain("data:")
      expect(out).toContain('"key"')
    })

    it("appends non-object args with space", () => {
      const stream = makeStream()
      const log = createLogger({ stream, level: "debug", colors: false })
      log.info("code", 42)
      expect(stream.toString()).toContain(" 42")
    })
  })

  describe("colors", () => {
    it("applies ANSI codes when colors enabled", () => {
      const stream = makeStream()
      stream.isTTY = true
      const log = createLogger({ stream, level: "debug" })
      log.info("colored")
      expect(stream.toString()).toContain("\x1b[")
    })
  })

  describe("child()", () => {
    it("creates scoped logger with parent name prefix", () => {
      const stream = makeStream()
      const log = createLogger({ stream, name: "app", colors: false })
      const child = log.child("db")
      child.info("connected")
      const out = stream.toString()
      expect(out).toContain("app:db")
    })

    it("child without parent name uses only child name", () => {
      const stream = makeStream()
      const log = createLogger({ stream, colors: false })
      const child = log.child("worker")
      child.info("started")
      expect(stream.toString()).toContain("worker ")
    })
  })

  describe("formatters", () => {
    it("colorize handles unknown color gracefully", () => {
      expect(colorize("text", "nonexistent", true)).toBe("text")
    })

    it("formatLevel handles unknown level gracefully", () => {
      const label = formatLevel("unknown", true)
      expect(label).toContain("UNKNOWN")
    })
  })
})
