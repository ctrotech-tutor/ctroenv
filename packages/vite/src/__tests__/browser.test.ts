import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import * as browser from "../browser"
import * as full from "../index"

const here = dirname(fileURLToPath(import.meta.url))

describe("browser entry", () => {
  it("exports viteSource only (no Node-only plugin)", () => {
    expect(Object.keys(browser).sort()).toEqual(["viteSource"])
    expect("ctroenvPlugin" in browser).toBe(false)
  })

  it("re-exports the same viteSource as the full entry (no fork)", () => {
    expect(browser.viteSource).toBe(full.viteSource)
  })

  it("browser entry and source never import node:* or vite (bundle-split tripwire)", () => {
    // Deliberately over-strict (even `import type` trips it): anything added
    // here lands in client bundles, so relaxing this must be a conscious,
    // reviewed decision. See browser.ts.
    const files = ["../browser.ts", "../source.ts"].map((f) =>
      readFileSync(resolve(here, f), "utf-8"),
    )
    for (const content of files) {
      expect(content).not.toMatch(/from\s+["']node:/)
      expect(content).not.toMatch(/from\s+["']vite["']/)
      expect(content).not.toMatch(/import\(\s*["']vite["']\s*\)/)
      expect(content).not.toMatch(/require\(\s*["'](?:node:|vite["'])/)
    }
  })
})
