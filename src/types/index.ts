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

export type Framework = "react"
export type Language = "typescript" | "javascript"

