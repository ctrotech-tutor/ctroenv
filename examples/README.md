# CtroEnv Examples

Each example is a standalone project. To try one:

```bash
cd <example>
npm install
cp .env.example .env   # with-cli ships a deliberately broken one on purpose
npm start              # or the example's own command from the table below
```

(`github-actions` is a reusable workflow file, not a runnable project — it has no `.env.example`.)

## Verifying an example

Each runnable example has a self-contained `smoke` script that runs its documented happy path end-to-end:

```bash
cd <example>
npm install
npm run smoke
```

`with-cli`'s smoke additionally asserts the failure path: it resets `.env` from the deliberately broken fixture, watches validation fail, applies the documented fixes, and re-validates. Server examples (`with-express`, `monorepo`) boot, probe `/health`, and shut down automatically. CI runs every smoke on each PR (`.github/workflows/examples.yml`), installing lockless from the registry — example lockfiles are intentionally not committed.

## Quick Reference

| Example | Focus | Dependencies | Run |
|---------|-------|-------------|-----|
| [basic-node](./basic-node) | Core API — all validator types, `loadEnv()`, type inference | core, node, tsx | `npm start` |
| [with-express](./with-express) | Express server with startup validation | core, node, express, tsx | `npm start` |
| [with-vite](./with-vite) | Vite plugin + `viteSource()` for build-time validation | core, vite, vite | `npm run build` |
| [with-nextjs](./with-nextjs) | App Router server/client split, Proxy safety net | core, nextjs, next | `npm run dev` |
| [with-cli](./with-cli) | All 5 CLI commands — validate, generate, check, docs | core, node, cli, tsx | `npm run validate` |
| [monorepo](./monorepo) | Schema composition via workspace dependency sharing | core, node, cli, express | `npm run start:api` |

## What Each Example Teaches

### [basic-node](./basic-node)
- Every validator type (`string`, `number`, `boolean`, `pick`)
- Chainable methods (`.url()`, `.port()`, `.secret()`, `.min()`, `.default()`, `.optional()`, `.describe()`, `.regex()`)
- Full type inference — zero manual type annotations
- `loadEnv()` for `.env` file loading
- `CtroEnvError` output when validation fails
- Try removing `DATABASE_URL` from `.env` and re-run `npm start`

### [with-express](./with-express)
- Validating env **before** the server binds
- Graceful `try/catch` with `process.exit(1)` on failure
- Health endpoint exposing env metadata (not values)
- `ctroenv.config.ts` for CLI integration alongside app code
- Server-only vs client-only env split awareness

### [with-vite](./with-vite)
- `ctroenvPlugin()` for build-time validation — fails `vite build` on invalid env
- `viteSource()` for runtime access to `import.meta.env`
- Schema in a shared module consumed by both plugin and runtime
- Try removing `VITE_API_URL` from `.env` and run `npm run build`

### [with-nextjs](./with-nextjs)
- `defineEnv()` with `server`/`client` split from `@ctroenv/nextjs`
- `withCtroEnv()` for build-time validation in `next.config.ts`
- Proxy-based safety net — server-only vars throw on client access
- `env.ts` + `schema.ts` separation pattern
- Try accessing the **"Try reading JWT_SECRET on the client"** button

### [with-cli](./with-cli)
- `.env` is deliberately **broken** — showcase CLI error output
- `ctroenv validate` — grouped missing/invalid errors with suggestions
- `ctroenv generate` — auto-creates `.env.example` from schema
- `ctroenv check` — CI-friendly structural diff (missing + unused keys)
- `ctroenv docs` — auto-generates `ENVIRONMENT.md`
- `ctroenv.config.ts` with secrets masking and output paths
- Steps: `cp .env.example .env` → run `npm run validate` to see the errors → fix `.env` → re-run to see success → generate docs

### [monorepo](./monorepo)
- Sharing base schema via workspace dependency (`@example/shared-config`)
- Schema **composition via object spread** — each package extends the base
- Multiple services (API + Worker) with independent validation
- Single `.env` at workspace root covering all packages
- Run both services side-by-side with different env requirements
