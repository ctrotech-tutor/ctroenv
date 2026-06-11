# Publishing Guide — CtroEnv Packages

> Publish order: `@ctroenv/shared` → `@ctroenv/core` (one-by-one, in sequence).

## Prerequisites

```bash
# 1. Verify you're logged into npm
npm whoami

# 2. If not, login
npm login

# 3. Confirm you have access to @ctroenv org
npm access ls-collaborators @ctroenv/shared
# (you should see your user listed as owner/maintainer)
```

---

## Step 1 — Publish `@ctroenv/shared`

```bash
# Build fresh
npm run build --workspace=packages/shared

# Inspect what will be published (dry run)
npm pack --workspace=packages/shared --dry-run
# Check that only dist/ files appear (no src/, tsconfig, etc.)

# Publish
npm publish --workspace=packages/shared
```

**Confirm propagation** (wait ~30 seconds):

```bash
npm view @ctroenv/shared
```

Or check at [npmjs.com/package/@ctroenv/shared](https://npmjs.com/package/@ctroenv/shared).

---

## Step 2 — Publish `@ctroenv/core`

Only after Step 1 is confirmed:

```bash
# Build fresh
npm run build --workspace=packages/core

# Dry run
npm pack --workspace=packages/core --dry-run

# Publish
npm publish --workspace=packages/core

# Verify
npm view @ctroenv/core
```

---

## Version Bumping (Optional)

All packages are at `1.0.0` (stable API from day one). Future bumps:

```bash
# Patch: bug fixes (1.0.1)
npm version patch --workspace=packages/shared --workspace=packages/core

# Minor: new features (1.1.0)
npm version minor --workspace=packages/shared --workspace=packages/core

# Major: breaking changes (2.0.0)
npm version major --workspace=packages/shared --workspace=packages/core
```

> **Important:** `npm version` creates a git commit and tag. Commit/push before publishing using `changeset` instead for changelog generation.

---

## Common Pitfalls

| Error | Cause | Fix |
|---|---|---|
| `403 Forbidden` | Not logged in or not in org | `npm login` or check `npm org ls @ctroenv` |
| `409 Conflict` | Version already exists | Bump version with `npm version` |
| `404 Not Found` | Org doesn't exist — need to create | `npm org create @ctroenv` or publish as personal scoped `@yourname/...` |
| Dry run shows `src/` in tarball | `package.json` missing `"files": ["dist"]` | Add `files` field to `package.json` |
