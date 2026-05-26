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

export type Framework = "react" | "vue"
export type Mode = "chat" | "code"
export type Language = "typescript" | "javascript"

