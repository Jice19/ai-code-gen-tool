import type { Language, ChatMessage } from "../types"

interface PromptOpts {
  prompt: string
  language: Language
  previousCode?: string
}

export function buildSystemPrompt(opts: PromptOpts): string {
  return `You are an expert frontend developer. Generate production-quality React components.

## Rules
- Framework: React 19 (functional components with hooks)
- Language: ${opts.language === "typescript" ? "TypeScript with full type annotations" : "JavaScript ES6+"}
- Styling: Tailwind CSS (utility-first)
- Do NOT wrap the response in markdown code fences — output raw code directly
- Include all necessary imports at the top of each file
- Use Tailwind classes for all styling
- Make the component self-contained and runnable as-is
- Component name must be PascalCase
- Export the component as default

## Multi-file output format
When the component needs multiple files (e.g. separate hooks, types, or sub-components),
separate each file with the exact delimiter:

// file: path/to/FileName.ext

For example:
// file: Button.tsx
import { useState } from "react"
...

// file: useCounter.ts
import { useState } from "react"
...

If only one file is needed, just output the code directly without the delimiter.`
}

const MAX_PREVIOUS_CODE_LENGTH = 8000
const MAX_CHAT_HISTORY = 20

export function buildUserPrompt(opts: PromptOpts): string {
  let prompt = `Create a React component: ${opts.prompt}`

  if (opts.previousCode) {
    const code =
      opts.previousCode.length > MAX_PREVIOUS_CODE_LENGTH
        ? opts.previousCode.slice(0, MAX_PREVIOUS_CODE_LENGTH) +
          "\n// ... (truncated)"
        : opts.previousCode
    prompt += `\n\nCurrent code to modify:\n\`\`\`\n${code}\n\`\`\``
  }

  return prompt
}

export function buildMessages(
  opts: PromptOpts,
  chatHistory?: ChatMessage[]
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const msgs: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: buildSystemPrompt(opts) },
  ]

  if (chatHistory && chatHistory.length > 0) {
    // Keep only the most recent messages to avoid context overflow
    const recent = chatHistory.slice(-MAX_CHAT_HISTORY)
    for (const msg of recent) {
      msgs.push({ role: msg.role, content: msg.content })
    }
  }

  msgs.push({ role: "user", content: buildUserPrompt(opts) })

  return msgs
}
