# Phase 6 — Documentation Site

**Status:** In Progress  
**Repository:** `apps/docs/` (separate git repo: `github.com/ctrotech-tutor/ctroenv-docs`)  
**URL:** `https://ctroenv.vercel.app`  
**Stack:** Next.js 16, Tailwind CSS v4, shadcn/ui, Fumadocs, Umami Analytics, Vercel

---

## Design System

### Colors
- **Primary:** Indigo (`#4F46E5`) → Violet (`#7C3AED`) gradient
- **Success:** Emerald (`#10B981`)
- **Destructive:** Rose/Red for errors
- **Background:** White / Zinc-50 (light), Neutral-950 (dark)
- **Code:** `--shiki-*` CSS variables

### Typography
- **Font:** Geist Sans (UI), Geist Mono (code) — already configured
- **Scale:** Tailwind CSS v4 theme variables

### Logo
- Shield outline + checkmark icon
- Indigo→Violet gradient fill
- `components/logo.tsx` — inline React SVG component
- `public/favicon.svg` — monochrome variant

---

## Content Architecture

### Route Structure
```
/                          → Landing hero page
/docs                      → Docs index / sidebar
/docs/getting-started      → Installation, quick start
/docs/core                 → Core package reference
  /docs/core/define-env    
  /docs/core/string        
  /docs/core/number        
  /docs/core/boolean       
  /docs/core/pick          
  /docs/core/chainable     
  /docs/core/errors        
/docs/cli                  → CLI commands
  /docs/cli/validate       
  /docs/cli/generate       
  /docs/cli/check          
  /docs/cli/docs           
  /docs/cli/init           
/docs/node                 → Node adapter
/docs/vite                 → Vite adapter
/docs/nextjs               → Next.js adapter
/docs/migration            → Migration guides
  /docs/migration/from-t3-env
  /docs/migration/from-envalid
  /docs/migration/from-dotenv
/blog                      → Release notes, announcements
```

### Content Templates
Every function/command page follows:
1. **Signature** — TypeScript signature with code block
2. **Description** — What it does, when to use it
3. **Parameters** — Table of parameters with types and descriptions
4. **Examples** — Code examples (min 2: basic + advanced)
5. **Edge Cases** — Error conditions, coercion rules
6. **Related** — Links to related pages

### Tone & Style
- Professional, clear, welcoming to junior devs
- Code examples use real env var names (`DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL`)
- Error output examples use `✗` and `✓` to match library output
- Consistent heading hierarchy (H1 per page, H2 for sections, H3 for sub-sections)

---

## Phases

### Phase 1 — Foundation
- [x] Install shadcn/ui + components (breadcrumb, button, card, command, dialog, drawer, input, navigation-menu, sheet, tabs)
- [ ] Install remaining: accordion, separator, scroll-area, tooltip, select
- [ ] Write SVG logo component (`components/logo.tsx`)
- [ ] Configure theme in `globals.css` (brand palette, code theme, dark/light)
- [ ] Build Header component (logo, nav links, GitHub star, theme toggle, mobile sheet)
- [ ] Build Sidebar component (search, accordion tree nav)
- [ ] Build Footer component
- [ ] Root layout with metadata template, Umami script, layout shell
- [ ] Setup Fumadocs (`fumadocs.config.js`, content dir, MDX setup)
- [ ] SEO base (sitemap.ts, robots.ts, manifest.ts, JSON-LD)

### Phase 2 — Routes & Navigation
- [ ] Create all page route stubs
- [ ] Sidebar data tree (`lib/sidebar.ts`)
- [ ] Search integration with Fumadocs/Pagefind
- [ ] Doc page template (TOC, edit link, prev/next pagination)
- [ ] Code block component (shiki, dual theme, copy button)

### Phase 3 — Core Content
- [ ] Home page (hero, features, code example, CTA)
- [ ] Getting Started guide
- [ ] Core Concepts
- [ ] `string()` — full reference
- [ ] `number()` — full reference
- [ ] `boolean()` — full reference
- [ ] `pick()` — full reference
- [ ] Chainable methods (`.optional()`, `.default()`, `.describe()`, `.secret()`, `.validate()`)
- [ ] `defineEnv()` — source injection, error handling
- [ ] Error Handling reference (codes, `CtroEnvError`, `formatErrors()`)
- [ ] Refinements (`url`, `email`, `regex`, `min`, `max`, `port`, `integer`, `positive`)

### Phase 4 — CLI & Adapter Content
- [ ] CLI Overview / installation
- [ ] `ctroenv validate` command
- [ ] `ctroenv generate` command
- [ ] `ctroenv check` command
- [ ] `ctroenv docs` command
- [ ] `ctroenv init` command
- [ ] CLI configuration (`ctroenv.config.ts`)
- [ ] Node adapter (`loadEnv`, `nodeSource`)
- [ ] Vite adapter (`ctroenvPlugin`, `viteSource`)
- [ ] Next.js adapter (client/server split, `withCtroEnv`, proxy)

### Phase 5 — Migration & Blog
- [ ] Migration from t3-env
- [ ] Migration from envalid
- [ ] Migration from dotenv
- [ ] Blog: v1.0.0 release
- [ ] Blog: v1.0.1 changelog

### Phase 6 — Package READMEs
- [ ] `packages/shared/README.md`
- [ ] `packages/core/README.md`
- [ ] `packages/cli/README.md`
- [ ] `packages/node/README.md`
- [ ] `packages/vite/README.md`
- [ ] `packages/nextjs/README.md`

### Phase 7 — Polish & Launch
- [ ] Umami Analytics script
- [ ] OG images (auto-generated per page)
- [ ] RSS feed for blog
- [ ] Lighthouse performance audit (target: 100/100)
- [ ] Accessibility audit
- [ ] Custom 404 page
- [ ] Custom domain setup

---

## Analytics
**Provider:** Umami (self-hosted or cloud)  
**Implementation:** Script tag in `<head>` via `next/script`  
**Events:** Page views, navigation clicks (optional)

## SEO Strategy
- Per-page metadata with `generateMetadata()` in Next.js App Router
- Open Graph images with `@vercel/og`
- JSON-LD structured data (Organization, TechArticle for docs, BlogPosting for blog)
- Sitemap auto-generation (`app/sitemap.ts`)
- Robots.txt (`app/robots.ts`)
- Canonical URLs
- Semantic HTML with proper heading hierarchy

## Accessibility
- Skip-to-content link
- ARIA labels on interactive elements
- Keyboard navigable sidebar
- Focus management on route changes
- Color contrast ratios meeting WCAG AA
- Screen reader friendly code blocks
