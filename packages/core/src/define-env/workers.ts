import type { EnvSource } from "./source"

export function workersSource(env: Record<string, string | undefined>): EnvSource {
  return { get: (key: string) => env[key] }
}
