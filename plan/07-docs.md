# Phase 7 — Documentation Site

**Status:** Ongoing (starts Phase 0, content written alongside each phase)  
**Technology:** Next.js 15, deployed to Vercel  
**URL:** `https://ctroenv.vercel.app` (custom domain later)

---

## 7.1 Architecture

```
apps/docs/
├── app/
│   ├── layout.tsx              # Root layout with nav + sidebar
│   ├── page.tsx                # Landing page
│   ├── docs/
│   │   ├── getting-started/    # Quick start guide
│   │   ├── api-reference/      # API docs per package
│   │   ├── cli/                # CLI commands reference
│   │   ├── migration/          # Migration guides
│   │   └── guides/             # Best practices, tutorials
│   └── blog/                   # Release notes, announcements
├── components/                 # Shared UI (code blocks, cards, table)
├── content/                    # MDX content files
├── public/                     # Static assets
├── styles/
│   └── globals.css             # Global styles
├── next.config.ts
└── vercel.json
```

---

## 7.2 Content Roadmap

| Phase | Content Written |
|---|---|
| **Phase 0** | Site setup, landing page, basic nav structure |
| **Phase 1** | API Reference: `defineEnv`, `string`, `number`, `boolean`, `pick`, refinements |
| **Phase 2** | CLI Guide: `validate`, `generate`, `check`, `docs` commands |
| **Phase 3** | Adapter docs: Node, Vite, Next.js setup guides |
| **Phase 4** | Migration guides from t3-env, envalid, dotenv |
| **Phase 5** | Enterprise features: secrets, ESLint, vault |

---

## 7.3 Site Sections

| Section | Description |
|---|---|
| **Home** | Hero, four pillars, feature highlights, CTA |
| **Getting Started** | Install → quick example → next steps |
| **API Reference** | Exhaustive reference for every export |
| **CLI** | Command documentation with examples |
| **Migration** | Side-by-side comparisons with other libs |
| **Guides** | Best practices, monorepo setup, CI/CD integration |
| **Blog** | Release posts, case studies, tutorials |

---

## 7.4 Component Library

```tsx
// Planned components
<CodeBlock language="ts" />
<Callout type="info | warning | error" />
<TableOfContents />
<Sidebar />
<SearchBar />
<PackageTabs packages={["core", "cli"]} />
<ValidatorDocs name="string" />
```

---

## 7.5 Deployment

- **Platform:** Vercel
- **Trigger:** Push to `main` with changes in `apps/docs/`
- **Preview:** Auto-deploys for PRs via Vercel GitHub integration
- **Domain:** `ctroenv.vercel.app` → custom domain later
