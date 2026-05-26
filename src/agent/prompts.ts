import type { Language, Framework, ChatMessage } from "../types"

interface PromptOpts {
  prompt: string
  language: Language
  framework?: Framework
  previousCode?: string
}

const MAX_PREVIOUS_CODE_LENGTH = 8000
const MAX_CHAT_HISTORY = 20

// --- Chat Mode ---

export function buildChatMessages(
  userMessage: string,
  chatHistory?: ChatMessage[]
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const msgs: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    {
      role: "system",
      content: `You are a senior frontend development assistant. Reply in natural language with helpful, concise advice.

## Rules
- Use markdown formatting for readability (headings, lists, bold, inline code)
- For code snippets, use fenced code blocks with language tags (e.g. \`\`\`tsx ... \`\`\`)
- Keep replies focused and practical
- If the user is asking a general question, answer directly
- If the user describes a component they want to build, suggest an approach before writing code
- Be friendly and conversational`,
    },
  ]

  if (chatHistory && chatHistory.length > 0) {
    const recent = chatHistory.slice(-MAX_CHAT_HISTORY)
    for (const msg of recent) {
      msgs.push({ role: msg.role, content: msg.content })
    }
  }

  msgs.push({ role: "user", content: userMessage })

  return msgs
}

// --- Code Generation Mode ---

function reactSystemPrompt(language: Language): string {
  return `You are an expert frontend developer. Generate production-quality React components.

## Rules
- Framework: React 19 (functional components with hooks)
- Language: ${language === "typescript" ? "TypeScript with full type annotations" : "JavaScript ES6+"}
- Styling: Tailwind CSS (utility-first)
- Do NOT wrap the response in markdown code fences — output raw code directly
- Include all necessary imports at the top of each file
- Use Tailwind classes for all styling
- Make the component self-contained and runnable as-is
- Component name must be PascalCase
- Export the component as default
- Do NOT import external npm packages (no uuid, axios, lodash, moment, etc.)
- Use only React built-in APIs and native browser APIs (fetch, crypto.randomUUID(), Date, etc.)
- For unique IDs use crypto.randomUUID() or Math.random().toString(36)

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

function vueSystemPrompt(language: Language): string {
  const lang = language === "typescript" ? "ts" : "js"
  return `You are an expert frontend developer. Generate production-quality Vue 3 components.

## Rules
- Framework: Vue 3 (Composition API with <script setup ${lang === "ts" ? 'lang="ts"' : ""}>)
- Language: ${language === "typescript" ? "TypeScript with full type annotations" : "JavaScript ES6+"}
- Styling: Tailwind CSS (utility-first)
- Do NOT wrap the response in markdown code fences — output raw code directly
- Include the full Vue SFC (<template>, <script setup>, <style>)
- Use Tailwind classes for all styling via the class attribute
- Make the component self-contained and runnable as-is
- Component name must be PascalCase
- Use <script setup> syntax — no options API
- Do NOT import external npm packages (no uuid, axios, lodash, moment, etc.)
- Use only Vue built-in APIs and native browser APIs (fetch, crypto.randomUUID(), Date, etc.)
- For unique IDs use crypto.randomUUID() or Math.random().toString(36)

## Multi-file output format
When the component needs multiple files (e.g. separate composables, sub-components, or types),
separate each file with the exact delimiter:

// file: path/to/FileName.vue

For example:
// file: TodoList.vue
<script setup ${lang === "ts" ? 'lang="ts"' : ""}>
import { ref } from "vue"
...

// file: useTodos.${lang}
import { ref } from "vue"
...

If only one file is needed, just output the code directly without the delimiter.`
}

export function buildSystemPrompt(opts: PromptOpts): string {
  if (opts.framework === "vue") {
    return vueSystemPrompt(opts.language)
  }
  return reactSystemPrompt(opts.language)
}

export function buildUserPrompt(opts: PromptOpts): string {
  const frameworkLabel = opts.framework === "vue" ? "Vue 3" : "React"
  let prompt = `Create a ${frameworkLabel} component: ${opts.prompt}`

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

// --- Shared ---

export function buildMessages(
  opts: PromptOpts,
  chatHistory?: ChatMessage[]
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const msgs: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: buildSystemPrompt(opts) },
  ]

  if (chatHistory && chatHistory.length > 0) {
    const recent = chatHistory.slice(-MAX_CHAT_HISTORY)
    for (const msg of recent) {
      msgs.push({ role: msg.role, content: msg.content })
    }
  }

  msgs.push({ role: "user", content: buildUserPrompt(opts) })

  return msgs
}
