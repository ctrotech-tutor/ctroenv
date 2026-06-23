# Phase 4: CLI Improvements

**Branch:** `phase/04-cli`
**Target tag:** `v1.6.0`
**Packages affected:** `cli`

---

## 4.1 JSON Output Mode for Validate

Add `--json` flag to `validate`. The current code already has a `displayJsonResult` function — refine it with:

**Schema (success):**
```json
{
  "version": "1.6.0",
  "valid": true,
  "source": "process.env",
  "total": 5,
  "errors": [],
  "timestamp": "2026-06-22T..."
}
```

**On failure:**
```json
{
  "version": "1.6.0",
  "valid": false,
  "source": "process.env",
  "total": 5,
  "errors": [
    { "key": "DATABASE_URL", "message": "Missing required env var", "code": "missing_required" }
  ],
  "timestamp": "2026-06-22T..."
}
```

**Key decisions:**
- No top-level `secrets` array — use per-variable `isSecret` field (already done in code, safer)
- `version` field added for tooling consumers (ChatGPT suggestion)
- `timestamp` for CI logging
- Secrets are already masked by core's `defineEnv()` Proxy — JSON output only sees `"********"`

**Files:**
- `packages/cli/src/commands/validate.ts` — update `displayJsonResult`

---

## 4.2 JSON Output Mode for Check

Refine existing JSON output in `check` command with `summary` block (ChatGPT suggestion):

```json
{
  "version": "1.6.0",
  "source": ".env",
  "total": 10,
  "clean": false,
  "summary": {
    "missing": 1,
    "unused": 2,
    "matched": 7
  },
  "missing": ["DATABASE_URL"],
  "unused": ["OLD_VAR", "STALE_KEY"],
  "matched": ["PORT", "NODE_ENV", "HOST", ...],
  "errors": [...]
}
```

**Files:**
- `packages/cli/src/commands/check.ts` — update JSON output

---

## 4.3 Unknown Var Warning

Add `--warn-unknown` flag to `check`. When enabled, scans the env source for keys NOT in the schema:

```
⚠ Unknown env vars found in source (not in schema):
  - DATABASE__URL (no match — did you mean DATABASE_URL?)
  - OLD_API_KEY (no longer in schema — consider removing)
```

**Typo detection:** Compare unknown keys against schema keys using Levenshtein distance. If a key is within 2 edits of a schema key, suggest it. This catches the most common mistakes (double underscores, transposed letters).

**Behavior:** Warning only (exit 0). No `--strict-unknown` yet — can be added later when users ask for it.

**Files:**
- `packages/cli/src/commands/check.ts` — add `--warn-unknown` flag
- `packages/cli/src/cli.ts` — register flag
- `packages/cli/src/utils/levenshtein.ts` — new file for typo detection

---

## 4.4 GitHub Actions Integration

Create `examples/github-actions/env-check.yml` — using **human mode** (JSON output without a parser is pointless; exit codes handle automation):

```yaml
name: Env Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx ctroenv check --strict
        env:
          NODE_ENV: test
```

**Why human mode:** The exit code (0 = success, 1 = failed) is what drives CI pass/fail. Human-readable output in logs is more useful for debugging than unparsed JSON.

For consumers who need parsed JSON (dashboards, Slack bots), the `--json` flag exists.

**Exit codes (documented):**
| Code | Meaning |
|------|---------|
| 0 | Success — all variables valid |
| 1 | Validation error — missing, invalid, or mismatched vars |
| 2 | Configuration error — schema not found, config parse failed |

**Also:** The existing stderr/stdout split (JSON to stdout, logs to stderr) is already correct — verified against current code.

**Files:**
- `examples/github-actions/env-check.yml` — new
- `examples/github-actions/README.md` — new

---

## Verification

```bash
npx vitest run packages/cli
npx tsc --noEmit
npx @biomejs/biome check packages/cli/src
# Manual test
npx ctroenv validate --json
npx ctroenv check --json --strict
npx ctroenv check --warn-unknown
```
