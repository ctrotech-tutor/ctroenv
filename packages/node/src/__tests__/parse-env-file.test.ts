import { parse as dotenvParse } from "dotenv"
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

  it("handles escaped quotes inside double-quoted values", () => {
    // CtroEnv intentionally unescapes `\"` (dotenv keeps it literal) to match
    // shell, Python, and Ruby dotenv behaviour. See DEVIATION_CASES below.
    const result = parseEnvFile('KEY="value \\"quoted\\" here"')
    expect(result).toEqual({ KEY: 'value "quoted" here' })
  })

  it("keeps single-quoted values literal (dotenv parity)", () => {
    // Single quotes are literal: no escape processing, matching dotenv and
    // shell. Use double quotes when escapes are needed.
    const result = parseEnvFile("KEY='it\\'s fine'")
    expect(result).toEqual({ KEY: "it\\'s fine" })
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

describe("dotenv parity", () => {
  // Every fixture here must parse IDENTICALLY to dotenv. This suite runs the
  // real dotenv parser live, so drift on either side fails loudly. Fixtures
  // must not contain `$` (ctroenv interpolates; dotenv does not) and must not
  // depend on ambient process.env.
  const PARITY_CASES: Array<{ name: string; content: string }> = [
    { name: "hash without preceding space truncates", content: "KEY=password#123" },
    { name: "hash with preceding space truncates", content: "KEY=value # comment" },
    { name: "value ending in hash", content: "KEY=a#" },
    { name: "hash-only value is empty", content: "KEY=#" },
    { name: "first hash wins", content: "KEY=a#b#c" },
    { name: "hash inside double quotes is kept", content: 'KEY="a#b"' },
    { name: "hash inside single quotes is kept", content: "KEY='a#b'" },
    { name: "hash inside backticks is kept", content: "KEY=`a#b`" },
    { name: "colon separator", content: "KEY: val" },
    { name: "colon separator keeps equals in value", content: "A: B=C" },
    { name: "colon without trailing space is skipped", content: "KEY:val" },
    { name: "space before colon is skipped", content: "KEY : val" },
    { name: "key with space is skipped", content: "my key=v" },
    { name: "empty key is skipped", content: "=v" },
    { name: "colon inside key is skipped", content: "K:E=Y" },
    { name: "dotted and dashed keys", content: "my.key=v\nmy-key=w" },
    { name: "export with tab separator", content: "export\tKEY=val" },
    { name: "export as key name", content: "export=1" },
    { name: "single quotes are fully literal", content: "KEY='a\\nb\\'c'" },
    { name: "backticks are fully literal", content: "KEY=`a\\nb`" },
    { name: "double quotes expand carriage return", content: 'KEY="a\\rb"' },
    { name: "double quotes keep backslash-quote literal", content: 'KEY="it\\\'s"' },
    { name: "junk after closing quote keeps line unquoted", content: 'KEY="a" junk' },
    { name: "two quoted segments on one line", content: 'KEY="a" "b"' },
    { name: "escapes expand in junk fallback", content: 'KEY="a\\nb" junk' },
    { name: "escaped quote in junk fallback stays literal", content: 'KEY="a\\" "b"' },
    { name: "junk after single-quoted close", content: "KEY='a' junk" },
    { name: "two single-quoted segments", content: "KEY='a' 'b'" },
    { name: "junk after backtick close", content: "KEY=`a` junk" },
    { name: "unterminated quote keeps stray quote", content: 'KEY="oops' },
    { name: "multiline double quotes", content: 'KEY="a\nb"' },
    { name: "multiline single quotes", content: "KEY='a\nb'" },
    { name: "multiline backticks", content: "KEY=`a\nb`" },
    { name: "unterminated multiline keeps first line", content: 'KEY="a\nb' },
    {
      name: "junk after multiline close falls back to first line",
      content: 'KEY="a\nb" junk\nNEXT=1',
    },
    { name: "lone carriage returns split lines", content: "A=1\rB=2" },
    { name: "later duplicate wins", content: "A=1\nA=2" },
  ]

  it.each(PARITY_CASES)("parses like dotenv: $name", ({ content }) => {
    expect(parseEnvFile(content)).toEqual(dotenvParse(content))
  })

  // Intentional, documented deviations from dotenv. Each asserts ctroenv's
  // behaviour AND that dotenv still differs, so if dotenv ever converges the
  // test tells us the deviation (and the README) can be retired.
  const DEVIATION_CASES: Array<{
    name: string
    content: string
    expected: Record<string, string>
  }> = [
    {
      name: "interpolates $VAR references",
      content: "A=1\nKEY=x$A",
      expected: { A: "1", KEY: "x1" },
    },
    {
      name: "joins trailing-backslash continuations",
      content: "KEY=one\\\n  two",
      expected: { KEY: "one\ntwo" },
    },
    {
      name: "unescapes double quotes inside double-quoted values",
      content: 'KEY="say \\"hi\\""',
      expected: { KEY: 'say "hi"' },
    },
  ]

  it.each(DEVIATION_CASES)("documented deviation holds: $name", ({ content, expected }) => {
    expect(parseEnvFile(content)).toEqual(expected)
    expect(dotenvParse(content)).not.toEqual(expected)
  })
})
