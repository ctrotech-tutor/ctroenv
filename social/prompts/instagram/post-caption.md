# Instagram Post — Carousel

**Format:** 10-slide carousel

**Slide 1 — Hook:**
"The #1 cause of production crashes isn't bad code. It's missing env vars. 🚨"

[Image prompt: Large bold text on a dark gradient background reading "process.env is a lie" with a red warning icon. Blue-to-teal gradient background. Flat text overlay style.]

**Slide 2 — Problem:**
"Every Node.js project has the same pattern:
❌ process.env sprinkled everywhere
❌ No validation on startup 
❌ Outdated .env.example
❌ Zero documentation"

[Image prompt: A checklist with 4 items, each with a red X icon. Styled like a to-do list. Dark background, white text. Simple flat design.]

**Slide 3 — Solution:**
"Meet CtroEnv — TypeScript-first env management.
Define your schema once. Get everything else for free."

[Image prompt: The ctroenv logo (stacked bars + green dot) centered. Blue (#2563eb) to teal (#14b8a6) gradient background. Clean product logo reveal style.]

**Slide 4 — Code:**
```
const env = defineEnv({
  DATABASE_URL: string().url(),
  PORT: number().port().default(3000),
  JWT_SECRET: string().secret(),
})
```

[Image prompt: VS Code dark theme showing TypeScript code with defineEnv syntax. Blue and teal syntax highlighting. Clean code screenshot.]

**Slide 5 — Type Safety:**
"TypeScript infers everything automatically.
env.PORT → TypeScript knows it's a number.
No manual types. No 'as string'. No surprises."

[Image prompt: A TypeScript type badge/label floating above a code snippet showing env.PORT being inferred as "number". Minimalist, focused on the type annotation.]

**Slide 6 — CLI:**
"4 CLI commands that save hours:
🔹 ctroenv validate — grouped errors
🔹 ctroenv generate — .env.example instantly
🔹 ctroenv check — CI-ready diff
🔹 ctroenv docs — ENVIRONMENT.md auto"

[Image prompt: A terminal window with 4 command lines, each with a small checkmark icon. Clean dark terminal. Blue (#2563eb) command text.]

**Slide 7 — Zero Deps:**
"@ctroenv/core: 4 KB gzipped. Zero dependencies.
Everything else is optional."

[Image prompt: A scale icon balancing "4 KB" on one side vs nothing on the other. Minimalist flat vector. Blue (#2563eb) color scheme.]

**Slide 8 — Frameworks:**
"Works everywhere:
🟢 Node.js — process.env
⚡ Vite — import.meta.env
▲ Next.js — build + runtime"

[Image prompt: Three framework logos (Node.js hexagon, Vite lightning, Next.js triangle) arranged in a row, connected by a line labeled "ctroenv". Flat vector.]

**Slide 9 — CTA:**
"Stop hoping your env vars are set.
Start validating them."

[Image prompt: Bold typography with "npm install @ctroenv/core" as the focal point. Blue (#2563eb) to teal (#14b8a6) gradient background. Clean, high-impact text layout.]

**Slide 10 — Links:**
"📖 ctroenv.vercel.app
⭐ GitHub: ctrotech-tutor/ctroenv
📦 npm: @ctroenv/core"

[Image prompt: Three link/button elements stacked vertically. Minimal design. Brand gradient background. Small ctroenv logo at top.]

---

**Post Caption (for copy/paste):**

The #1 cause of production crashes isn't bad code. It's missing environment variables. 🚨

Meet CtroEnv — a TypeScript-first toolkit that turns env management from a pain into a pleasure.

✅ Define your schema once
✅ Auto-generated types + validation
✅ Beautiful CLI with grouped errors
✅ Zero-dependency core (4 KB!)
✅ Works with Node, Vite, Next.js

Stop hoping your env vars are set. Start validating them.

npm i @ctroenv/core
🔗 Link in bio

#typescript #nodejs #webdev #opensource #javascript #programming #devtools #coding