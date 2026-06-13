"use client"

import { env } from "../env"
import { useState } from "react"

export function ClientTrap() {
  const [error, setError] = useState<string | null>(null)

  const tryAccessSecret = () => {
    try {
      const val = env.JWT_SECRET
      setError(`No error thrown — value: ${val}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <section>
      <h2>Server-only access (client-side)</h2>
      <button onClick={tryAccessSecret}>
        Try reading JWT_SECRET on the client
      </button>
      {error && (
        <pre style={{ color: "#e00", background: "#fef", padding: "1rem" }}>
          {error}
        </pre>
      )}
      <p>
        <em>The Proxy throws when a server-only var is accessed on the client.</em>
      </p>
    </section>
  )
}
