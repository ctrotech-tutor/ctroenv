import { describe, expect, it } from "vitest"
import { parseEnvFile } from "../index"

describe("parseEnvFile", () => {
  it("parses simple KEY=VAL pairs", () => {
    const result = parseEnvFile("DATABASE_URL=postgres://localhost/db\nPORT=3000")
    expect(result).toEqual({
      DATABASE_URL: "postgres://localhost/db",
      PORT: "3000",
    })
  })

  it("ignores comments and empty lines", () => {
    const result = parseEnvFile(
      ["# This is a comment", "", "KEY=value", "  # indented comment"].join("\n"),
    )
    expect(result).toEqual({ KEY: "value" })
  })

  it("trims whitespace from keys and values", () => {
    const result = parseEnvFile("  KEY  =  spaced-value  ")
    expect(result).toEqual({ KEY: "spaced-value" })
  })

  it("strips quotes from values", () => {
    const result = parseEnvFile(['STRING="hello world"', "CHAR='a'"].join("\n"))
    expect(result).toEqual({ STRING: "hello world", CHAR: "a" })
  })

  it("handles export prefix", () => {
    const result = parseEnvFile("export DATABASE_URL=postgres://localhost/db\nexport PORT=3000")
    expect(result).toEqual({
      DATABASE_URL: "postgres://localhost/db",
      PORT: "3000",
    })
  })

  it("strips inline comments from unquoted values", () => {
    const result = parseEnvFile("KEY=value # this is a comment\nANOTHER=hello")
    expect(result).toEqual({ KEY: "value", ANOTHER: "hello" })
  })

  it("preserves hash inside quoted values", () => {
    const result = parseEnvFile('KEY="value # not a comment"')
    expect(result).toEqual({ KEY: "value # not a comment" })
  })

  it("handles multiline values with trailing backslash", () => {
    const result = parseEnvFile(
      ["DATABASE_URL=postgres://localhost/\\", "  db?ssl=true"].join("\n"),
    )
    expect(result).toEqual({ DATABASE_URL: "postgres://localhost/\ndb?ssl=true" })
  })

  it("handles multiple continuation lines", () => {
    const result = parseEnvFile(["KEY=line one\\", "  line two\\", "  line three"].join("\n"))
    expect(result).toEqual({ KEY: "line one\nline two\nline three" })
  })

  it("interpolates $VAR references", () => {
    const result = parseEnvFile(["BASE_URL=http://localhost", "API_URL=$BASE_URL/api"].join("\n"))
    expect(result).toEqual({
      BASE_URL: "http://localhost",
      API_URL: "http://localhost/api",
    })
  })

  it("interpolates VAR references", () => {
    const result = parseEnvFile(
      // biome-ignore lint/suspicious/noTemplateCurlyInString: literal env file content
      ["HOST=localhost", "PORT=3000", "URL=http://${HOST}:${PORT}"].join("\n"),
    )
    expect(result).toEqual({
      HOST: "localhost",
      PORT: "3000",
      URL: "http://localhost:3000",
    })
  })

  it("preserves $VAR when variable is not defined", () => {
    const result = parseEnvFile("KEY=value_$NONEXISTENT")
    expect(result).toEqual({ KEY: "value_$NONEXISTENT" })
  })

  it("handles escaped quotes inside quoted values", () => {
    const result = parseEnvFile('KEY="value \\"quoted\\" here"')
    expect(result).toEqual({ KEY: 'value "quoted" here' })
  })

  it("handles escaped single quotes inside single-quoted values", () => {
    const result = parseEnvFile("KEY='it\\'s fine'")
    expect(result).toEqual({ KEY: "it's fine" })
  })

  it("skips lines without equals sign", () => {
    const result = parseEnvFile("KEY=value\nNOTAVALIDLINE\nANOTHER=val")
    expect(result).toEqual({ KEY: "value", ANOTHER: "val" })
  })
})
