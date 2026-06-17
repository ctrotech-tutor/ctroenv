# Contributing to CtroEnv

## Development Setup

```bash
# Clone the repo
git clone https://github.com/ctrotech-tutor/ctroenv.git
cd ctroenv

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

## Project Structure

```
ctroenv/
├── packages/
│   ├── core/        # Schema engine (zero deps)
│   ├── cli/         # CLI tooling
│   ├── node/        # Node.js adapter
│   ├── vite/        # Vite adapter
│   └── nextjs/      # Next.js adapter
├── apps/
│   └── docs/        # Documentation site (Next.js)
└── plan/            # Phase plans
```

## Making Changes

1. Create a feature branch from `main`
2. Make your changes
3. Add or update tests
4. Run `npm run lint && npm run typecheck && npm test`
5. Submit a pull request

## Commit Convention

We use conventional commits:

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation
- `chore:` — maintenance
- `refactor:` — code restructuring
- `test:` — testing
- `ci:` — CI/CD changes

## Code Style

- TypeScript strict mode
- No semicolons
- Double quotes
- 100 character line width
- Formatted with Biome
