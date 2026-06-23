# GitHub Actions Integration

This example shows how to integrate `ctroenv` into your GitHub Actions workflows.

## Workflows

### Validate CI Environment Variables (`validate-ci`)

Uses `ctroenv validate` to check that all required env vars are present and valid in the CI runner's `process.env`. Exit codes determine pass/fail — no JSON parsing needed.

### Check Committed .env File (`check-env-file`)

Reads the project's `.env` file and diffs it against the schema. Reports missing, unused, and unknown keys. The `--warn-unknown` flag also detects likely typos (e.g., `DATABASE__URL` suggests `DATABASE_URL`).

### Verify .env.example (`verify-example`)

Ensures `.env.example` stays in sync with the schema. Fails CI if it's stale.

## Usage

Copy `env-check.yml` to your project's `.github/workflows/` directory and adjust the env vars for the validate job.

> **Note:** JSON output (`--json`) is not useful in CI — exit codes are the standard pass/fail mechanism. Use `--json` only if piping to a custom parser (dashboard, Slack bot, etc.).
