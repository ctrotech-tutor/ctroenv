# Phase 4: CLI Improvements

**Branch:** `phase/04-cli`
**Target tag:** `v1.6.0`
**Packages affected:** `cli`

---

## 4.1 JSON Output Mode for Validate

Add `--json` flag support to `validate` command. Currently it only outputs human-readable tables. JSON output should produce:

```json
{
  "valid": true,
  "errors": [],
  "secrets": ["JWT_SECRET"],
  "timestamp": "2026-06-22T..."
}
```

On failure:

```json
{
  "valid": false,
  "errors": [
    { "key": "DATABASE_URL", "message": "Missing required env var", "code": "missing_required" }
  ],
  "secrets": ["JWT_SECRET"],
  "timestamp": "2026-06-22T..."
}
```

**Files:**
- `packages/cli/src/commands/validate.ts` — add `--json` implementation
- `packages/cli/src/cli.ts` — verify `--json` flag is registered

---

## 4.2 JSON Output Mode for Check

Same as 4.1 but for the `check` command. Include diff info:

```json
{
  "valid": true,
  "missing": ["DATABASE_URL"],
  "unused": ["OLD_VAR"],
  "matched": ["PORT", "NODE_ENV"],
  "strict": true,
  "errors": []
}
```

**Files:**
- `packages/cli/src/commands/check.ts` — add `--json` implementation

---

## 4.3 Unknown Var Warning

Add a `--warn-unknown` flag to `check` (and optionally `validate`). When enabled, it scans the env source for keys that are NOT in the schema and warns about them (typo detection, stale vars).

Output:

```
⚠ Unknown env vars found in source (not in schema):
  - DATABASE__URL (double underscore — did you mean DATABASE_URL?)
  - OLD_API_KEY (no longer in schema — consider removing)
```

**Files:**
- `packages/cli/src/commands/check.ts` — add `--warn-unknown` flag
- `packages/cli/src/cli.ts` — register `--warn-unknown` flag

---

## 4.4 GitHub Actions Integration

Create `examples/github-actions/README.md` and `examples/github-actions/env-check.yml`:

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
      - run: npx ctroenv check --json --strict
```

**Files:**
- `examples/github-actions/README.md` — new
- `examples/github-actions/env-check.yml` — new

---

## Verification

```bash
npx vitest run packages/cli
npx tsc --noEmit
npx @biomejs/biome check packages/cli/src
# Manual test
npx ctroenv validate --json
npx ctroenv check --json --strict
```
