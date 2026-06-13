import { env } from "../env"
import { ClientTrap } from "./client-trap"

export default function Home() {
  return (
    <main>
      <h1>{env.NEXT_PUBLIC_APP_NAME}</h1>

      <section>
        <h2>Server-side env</h2>
        <p>DATABASE_URL: <code>{env.DATABASE_URL}</code></p>
        <p>REDIS_URL: <code>{env.REDIS_URL}</code></p>
      </section>

      <section>
        <h2>Client-side env</h2>
        <p>API URL: <code>{env.NEXT_PUBLIC_API_URL}</code></p>
        <p>Sentry: <code>{env.NEXT_PUBLIC_SENTRY_DSN ?? "not configured"}</code></p>
      </section>

      <ClientTrap />
    </main>
  )
}
