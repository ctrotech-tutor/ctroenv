export function viteSource() {
  return {
    get(key: string): string | undefined {
      try {
        const env = (import.meta as unknown as Record<string, unknown>).env as
          | Record<string, string | undefined>
          | undefined
        if (env && key in env) {
          return env[key]
        }
      } catch {
        // Not in a Vite ESM environment
      }
      if (typeof process !== "undefined" && process.env) {
        return process.env[key]
      }
      return undefined
    },
  }
}
