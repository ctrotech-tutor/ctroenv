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
  schema: string
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
