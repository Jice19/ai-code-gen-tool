export interface GeneratedFile {
  name: string
  content: string
  language: string
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
}

export interface CapturedError {
  title: string
  path: string
  message: string
  line: number
  column: number
  source: "compile" | "runtime"
}

export interface FixAttempt {
  errors: CapturedError[]
  beforeFiles: GeneratedFile[]
  afterFiles: GeneratedFile[]
  timestamp: number
}

// Agent Tool-Using Types

export interface ToolCall {
  name: string
  arguments: Record<string, string>
}

export interface ToolResult {
  success: boolean
  message: string
  data?: string
}

export interface AgentStep {
  id: string
  thought: string
  toolCall: ToolCall | null
  result: ToolResult | null
  timestamp: number
}

export type Framework = "react" | "vue"
export type Mode = "chat" | "quick" | "agent"
export type Language = "typescript" | "javascript"

