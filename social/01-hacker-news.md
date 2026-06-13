I built CtroEnv to solve a simple but annoying problem: managing environment variables safely in TypeScript without runtime surprises.

Most Node.js apps rely on process.env directly, which is untyped and often breaks at runtime.

CtroEnv provides a schema-based, TypeScript-first way to define and validate environment variables with full type inference and zero runtime dependencies in the core.

### Example

```ts
import { defineEnv, string, number, pick } from "@ctroenv/core"

const env = defineEnv({
  DATABASE_URL: string().url(),
  PORT: number().port().default(3000),
  JWT_SECRET: string().secret(),
  NODE_ENV: pick(["dev", "staging", "prod"]),
})

env.PORT // number
env.NODE_ENV // "dev" | "staging" | "prod"
````

### What it includes

* Zero-dependency core package
* Full TypeScript inference (no assertions needed)
* Schema-based validation
* Helpful error messages with grouping and color support
* CLI tools for teams

### CLI

```bash
ctroenv validate   # validate .env against schema
ctroenv generate   # create .env.example
ctroenv check      # compare env vs schema (CI-friendly)
ctroenv docs       # generate ENVIRONMENT.md
```

### Why I built it

I wanted something lighter than existing solutions while still being structured enough for team projects and CI workflows.

Most tools either:

* rely on external validators
* or don’t give good CLI/dev workflow support

CtroEnv tries to stay minimal in runtime but strong in tooling.

### Feedback welcome

I’d appreciate feedback on:

* API design
* CLI workflow
* missing features
* real-world usage issues

MIT licensed.

---

### Links

* GitHub: [https://github.com/ctrotech-tutor/ctroenv](https://github.com/ctrotech-tutor/ctroenv)
* Docs: [https://ctroenv.vercel.app](https://ctroenv.vercel.app)
* npm: [https://www.npmjs.com/org/ctroenv](https://www.npmjs.com/org/ctroenv)