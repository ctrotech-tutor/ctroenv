export interface CliConfig {
  schema?: string
  sources?: Record<string, string>
  output?: {
    example?: string
    docs?: string
  }
  secrets?: {
    mask?: string[]
    maskWith?: string
  }
}

export interface ResolvedConfig {
  /** Explicit schema path (flag or config file), or null to auto-discover. */
  schema: string | null
  sources: Record<string, string>
  output: {
    example: string
    docs: string
  }
  secrets: {
    mask: string[]
    maskWith: string
  }
}

export type Format = "text" | "json"
