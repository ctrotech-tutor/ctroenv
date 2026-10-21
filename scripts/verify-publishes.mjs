// Post-release guard: every version tagged by the Release loop must exist on
// npm, or the run fails loudly. Compares local git tags (created by this
// run's semantic-release invocations) against the registry and polls
// ahead-versions with retries. The window is deliberately generous: on
// 2026-10-21 core@1.5.2 took ~13 minutes to surface on npm while the run
// reported success, so anything under ~15 minutes risks false alarms.
// Tuning via env: VERIFY_RETRIES (default 30), VERIFY_DELAY_MS (default 30000).
import { execFileSync } from "node:child_process"

const PACKAGES = ["shared", "core", "cli", "node", "vite", "nextjs"]
const RETRIES = Number(process.env.VERIFY_RETRIES ?? 30)
const DELAY_MS = Number(process.env.VERIFY_DELAY_MS ?? 30_000)

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8" }).trim()
}

// Numeric x.y.z compare with prerelease-suffix awareness. Returns >0 if a is
// newer than b, 0 if equal, <0 if older.
function cmpVersions(a, b) {
  const parse = (v) => {
    const [nums, suffix] = v.split("-", 2)
    return { parts: nums.split(".").map(Number), suffix: suffix ?? "" }
  }
  const pa = parse(a)
  const pb = parse(b)
  for (let i = 0; i < Math.max(pa.parts.length, pb.parts.length); i++) {
    const d = (pa.parts[i] ?? 0) - (pb.parts[i] ?? 0)
    if (d !== 0) return d
  }
  if (pa.suffix === pb.suffix) return 0
  return pa.suffix === "" ? 1 : -1
}

function latestTagVersion(pkg) {
  const out = sh("git", ["tag", "--list", `${pkg}-v*`])
  if (!out) return null
  const versions = out
    .split("\n")
    .map((t) => t.slice(`${pkg}-v`.length))
    .filter(Boolean)
  versions.sort(cmpVersions)
  return versions[versions.length - 1] ?? null
}

function registryLatest(name) {
  return sh("npm", ["view", `${name}@latest`, "version", "--json", "--prefer-online"]).replaceAll(
    '"',
    "",
  )
}

function registryHas(name, version) {
  try {
    execFileSync(
      "npm",
      ["view", `${name}@${version}`, "version", "--json", "--prefer-online"],
      { stdio: "pipe" },
    )
    return true
  } catch {
    return false
  }
}

let failed = false
for (const pkg of PACKAGES) {
  const name = `@ctroenv/${pkg}`
  const tagged = latestTagVersion(pkg)
  if (!tagged) {
    console.log(`- ${name}: no tags found, skipping`)
    continue
  }
  const latest = registryLatest(name)
  if (cmpVersions(tagged, latest) <= 0) {
    console.log(`- ${name}: tag ${tagged} <= registry latest ${latest}, nothing to verify`)
    continue
  }
  console.log(`- ${name}: tag ${tagged} ahead of registry latest ${latest}, polling npm...`)
  let ok = false
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    if (registryHas(name, tagged)) {
      ok = true
      console.log(`  OK: ${name}@${tagged} found on npm (attempt ${attempt})`)
      break
    }
    console.log(`  attempt ${attempt}/${RETRIES}: not yet visible, waiting ${DELAY_MS}ms...`)
    sleep(DELAY_MS)
  }
  if (!ok) {
    console.error(`  FAIL: ${name}@${tagged} missing from npm after ${RETRIES} attempts`)
    failed = true
  }
}
process.exit(failed ? 1 : 0)
