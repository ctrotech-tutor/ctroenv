export const version = "0.0.0"

export function nodeSource() {
  return {
    get(key: string): string | undefined {
      return process.env[key]
    },
  }
}
