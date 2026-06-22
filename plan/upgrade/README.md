# CtroEnv Upgrade Plan

## Branch Strategy

Each phase is developed on its own feature branch and merged to `main` only after full verification.

```
main ────┬── phase/01-bug-fixes ─── verify ──► merge ──┬── phase/02-client-server ─── verify ──► merge ──→ ...
         │                                              │
         └── (social content)                           └── (tag: v1.3.0)
```

### Naming
- **Branches:** `phase/<number>-<short-description>`
- **Tags:** `v<major>.<minor>.<patch>` (e.g., `v1.3.0` after Phase 1)
- **Commits:** `phase(X): <message>` prefix for easy filtering

### Workflow per phase
1. Branch off `main`
2. Implement changes
3. Self-review: `npx vitest run packages/<name>`, `npx tsc --noEmit`, `npx @biomejs/biome check`
4. Create PR (or commit directly if solo)
5. Merge to `main` with `--no-ff`
6. Tag release
7. Next phase branches from updated `main`

---

## Phase Overview

| Phase | Branch | Focus | Est. Impact |
|-------|--------|-------|-------------|
| 1 | `phase/01-bug-fixes` | Core bugs, edge cases, validation hardening | core, node |
| 2 | `phase/02-client-server` | Client/server variable split for Next.js + Vite | core, nextjs, vite |
| 3 | `phase/03-cross-runtime` | Deno, Bun, CF Workers source detection | core, node |
| 4 | `phase/04-cli` | JSON output, CI integration, unknown var warnings | cli |
| 5 | `phase/05-security` | structuedClone, mask config, error hardening | core |
| 6 | `phase/06-validators` | semver, ip, uuid validators | core |

---

## Current State

- **Branch:** `main` (up to date with `origin/main`)
- **Remote:** `https://github.com/ctrotech-tutor/ctroenv.git`
- **Uncommitted:** social/ content restructuring (prompts, directory moves) — committed separately before Phase 1
- **Active tags:** `v1.2.0`, `v1.1.1`, `v1.1.0`, `v1.0.1`, package-specific releases
