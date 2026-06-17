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

  it("handles CRLF line endings", () => {
    const result = parseEnvFile("KEY=value\r\nANOTHER=val\r\n")
    expect(result).toEqual({ KEY: "value", ANOTHER: "val" })
  })

  it("strips BOM character from start", () => {
    const result = parseEnvFile("\uFEFFKEY=value\nANOTHER=val")
    expect(result).toEqual({ KEY: "value", ANOTHER: "val" })
  })

  it("handles quoted value with inline comment", () => {
    const result = parseEnvFile('KEY="val" # comment')
    expect(result).toEqual({ KEY: "val" })
  })

  it("handles $$ escaping to literal dollar sign", () => {
    const result = parseEnvFile("DOLLAR=$$")
    expect(result).toEqual({ DOLLAR: "$" })
  })

  it("handles empty value after equals sign", () => {
    const result = parseEnvFile("KEY=\nANOTHER=val")
    expect(result).toEqual({ KEY: "", ANOTHER: "val" })
  })

  it("handles multiple equals signs in value", () => {
    const result = parseEnvFile("KEY=foo=bar=baz")
    expect(result).toEqual({ KEY: "foo=bar=baz" })
  })

  it("handles unicode in values", () => {
    const result = parseEnvFile('GREETING="Hëllö Wörld"\nSYMBOL=🚀')
    expect(result).toEqual({ GREETING: "Hëllö Wörld", SYMBOL: "🚀" })
  })

  it("handles very long values", () => {
    const longValue = "A".repeat(10000)
    const result = parseEnvFile(`KEY=${longValue}`)
    expect(result).toEqual({ KEY: longValue })
  })

  it("handles export with leading whitespace", () => {
    const result = parseEnvFile("  export KEY=value")
    expect(result).toEqual({ KEY: "value" })
  })

  it("handles empty quoted strings", () => {
    const result = parseEnvFile(['KEY=""', "KEY2=''"].join("\n"))
    expect(result).toEqual({ KEY: "", KEY2: "" })
  })

  it("handles nested quotes of opposite type", () => {
    const result = parseEnvFile("KEY='value\"double\"'\nANOTHER=\"value'single'\"")
    expect(result).toEqual({ KEY: 'value"double"', ANOTHER: "value'single'" })
  })

  it("handles trailing backslash on last line as incomplete continuation", () => {
    const result = parseEnvFile("KEY=start\\")
    expect(result).toEqual({})
  })

  it("interpolates $VAR from process.env fallback", () => {
    process.env.TEST_FALLBACK = "from_process"
    const result = parseEnvFile("KEY=hello_$TEST_FALLBACK")
    expect(result).toEqual({ KEY: "hello_from_process" })
    delete process.env.TEST_FALLBACK
  })

  it("interpolates $VAR from file vars over process.env", () => {
    process.env.TEST_SHADOW = "from_process"
    const result = parseEnvFile("TEST_SHADOW=from_file\nKEY=prefix_$TEST_SHADOW")
    expect(result).toEqual({ TEST_SHADOW: "from_file", KEY: "prefix_from_file" })
    delete process.env.TEST_SHADOW
  })
})
