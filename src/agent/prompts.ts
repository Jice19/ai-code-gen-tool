import type { Language, Framework, ChatMessage, CapturedError, GeneratedFile } from "../types"
import { formatToolsForPrompt, type ToolDefinition } from "./tools"

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

// --- Few-Shot Examples ---

const REACT_FEW_SHOT = `## Example — Correct Output Format

User: "A simple counter button with + and -"

Your ENTIRE response (nothing before or after):

// plan: Single Counter component
// plan: State — count (number, initialized to 0)
// plan: Events — two buttons call setCount(c => c ± 1)
import { useState } from "react"

export default function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex items-center gap-4 p-4">
      <button
        className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
        onClick={() => setCount((c) => c - 1)}
      >
        -
      </button>
      <span className="text-2xl font-bold text-zinc-100">{count}</span>
      <button
        className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
        onClick={() => setCount((c) => c + 1)}
      >
        +
      </button>
    </div>
  )
}

## Wrong — NEVER do this:
\`\`\`tsx
import { useState } from "react"
...
\`\`\`
Here is a Counter component that... ← NO EXPLANATIONS

// file: Counter.tsx  ← Only use "// file:" delimiter when you need MULTIPLE files`

const VUE_FEW_SHOT = `## Example — Correct Output Format

User: "A simple counter button with + and -"

Your ENTIRE response (nothing before or after):

// plan: Single Counter.vue SFC
// plan: State — count ref (number, initialized to 0)
// plan: Events — two buttons modify count directly
<script setup lang="ts">
import { ref } from "vue"

const count = ref(0)
</script>

<template>
  <div class="counter">
    <button class="btn" @click="count--">-</button>
    <span class="value">{{ count }}</span>
    <button class="btn" @click="count++">+</button>
  </div>
</template>

<style scoped>
.counter {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
}
.btn {
  padding: 0.5rem 1rem;
  background: #3f3f46;
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background 0.15s;
}
.btn:hover {
  background: #52525b;
}
.value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f4f4f5;
}
</style>

## Wrong — NEVER do this:
\`\`\`vue
<script setup lang="ts">
...
</script>
\`\`\`
Here is a Vue Counter component... ← NO EXPLANATIONS

// file: Counter.vue  ← Only use "// file:" delimiter when you need MULTIPLE files`

// --- Code Generation Mode ---

function reactSystemPrompt(language: Language): string {
  return `You are an expert frontend developer. Generate production-quality React components.

## Critical: Output ONLY raw code
- Your ENTIRE response must be nothing but code. No markdown headings, no descriptions, no file trees, no usage examples, no summaries, no explanations.
- **Exception:** You MAY start with 2-5 lines of "// plan:" comments describing your architecture before the code.
- Do NOT use markdown code fences (\`\`\`) anywhere.
- If the user asks for a component, output ONLY the source files — nothing else.
- Do not say "Here is the component" or any similar preamble.

## Planning (recommended)
Before writing code, output a brief plan as "// plan:" comments:
// plan: ComponentName — purpose
// plan: State — varName (type, initial value)
// plan: Events — onClick → handlerName
// plan: Children — ChildA receives propX, ChildB calls onY callback

## Rules
- Framework: React 19 (functional components with hooks)
- Language: ${language === "typescript" ? "TypeScript with full type annotations" : "JavaScript ES6+"}
- Styling: Tailwind CSS (utility-first)
- Include all necessary imports at the top of each file
- Use Tailwind classes for all styling
- Make the component self-contained and runnable as-is
- Component name must be PascalCase
- Export the component as default
- Do NOT import external npm packages (no uuid, axios, lodash, moment, etc.)
- Use only React built-in APIs and native browser APIs (fetch, crypto.randomUUID(), Date, etc.)
- For unique IDs use crypto.randomUUID() or Math.random().toString(36)

## Defensive Coding
- Every useState MUST have an initial value — never call useState() with no arguments
- All component props that receive arrays/objects MUST have default values (e.g. items = [])
- Before accessing .length, .map(), .filter(), or any array method, verify the value is not undefined
- Render an explicit "empty state" (e.g. "No items found") when a list is empty
- If a prop could be undefined, use optional chaining (?.) and nullish coalescing (??)

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

If only one file is needed, just output the code directly without the delimiter.

${REACT_FEW_SHOT}`
}

function vueSystemPrompt(language: Language): string {
  const lang = language === "typescript" ? "ts" : "js"
  return `You are an expert frontend developer. Generate production-quality Vue 3 components.

## Critical: Output ONLY raw code
- Your ENTIRE response must be nothing but code. No markdown headings, no descriptions, no file trees, no usage examples, no summaries, no explanations.
- **Exception:** You MAY start with 2-5 lines of "// plan:" comments describing your architecture before the code.
- Do NOT use markdown code fences (\`\`\`) anywhere.
- If the user asks for a component, output ONLY the source files — nothing else.
- Do not say "Here is the component" or any similar preamble.

## Planning (recommended)
Before writing code, output a brief plan as "// plan:" comments:
// plan: ComponentName — purpose
// plan: State — varName (type, initial value)
// plan: Events — @event → handlerName
// plan: Children — ChildA receives propX, ChildB emits onY event

## Rules
- Framework: Vue 3 (Composition API with <script setup ${lang === "ts" ? 'lang="ts"' : ""}>)
- Language: ${language === "typescript" ? "TypeScript with full type annotations" : "JavaScript ES6+"}
- Styling: Use <style scoped> with clean, well-organized CSS. Do NOT use Tailwind CSS.
- Make the component self-contained and runnable as-is
- Component name must be PascalCase
- Use <script setup> syntax — no options API
- Do NOT import external npm packages (no uuid, axios, lodash, moment, etc.)
- Use only Vue built-in APIs and native browser APIs (fetch, crypto.randomUUID(), Date, etc.)
- For unique IDs use crypto.randomUUID() or Math.random().toString(36)

## Defensive Coding
- Every ref() and reactive() MUST have an initial value — never call ref() with no arguments
- All props with objects/arrays MUST have default values via defineProps defaults or default values
- Before accessing .length, .map(), .filter(), or any array method, verify the value is not undefined
- Render an explicit "empty state" (e.g. "No items found") when a list is empty
- If a value could be undefined, use optional chaining (?.) and nullish coalescing (??)

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

If only one file is needed, just output the code directly without the delimiter.

${VUE_FEW_SHOT}`
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

// --- Self-Healing Fix ---

function classifyErrors(errors: CapturedError[]): {
  compileErrors: CapturedError[]
  runtimeErrors: CapturedError[]
} {
  const compileErrors = errors.filter((e) => e.source === "compile")
  const runtimeErrors = errors.filter((e) => e.source === "runtime")
  return { compileErrors, runtimeErrors }
}

function getStrategyForAttempt(
  attempt: number,
  { compileErrors, runtimeErrors }: ReturnType<typeof classifyErrors>
): string {
  if (attempt >= 3) {
    // Last resort: focus on the first error only
    const first = compileErrors[0] ?? runtimeErrors[0]
    if (!first) return "Fix the first error and output all files."
    return `Fix ONLY this one error and output all files unchanged except for this fix:\n- ${first.path}:${first.line} — ${first.message}`
  }

  if (attempt >= 2) {
    // Second attempt: be more careful, output only changed files
    return "Fix ALL errors. Output ONLY the files that changed — do NOT output unchanged files. Use the exact same // file: delimiter format."
  }

  return "Fix ALL errors. Output ALL files using the exact // file: delimiter format."
}

export function buildFixPrompt(
  errors: CapturedError[],
  files: GeneratedFile[],
  attempt: number = 1
): Array<{ role: "system" | "user"; content: string }> {
  const { compileErrors, runtimeErrors } = classifyErrors(errors)

  const compileList = compileErrors.length > 0
    ? `### Compile Errors\n${compileErrors
        .map((e) => `- ${e.path}:${e.line}:${e.column} — ${e.message}`)
        .join("\n")}`
    : ""

  const runtimeList = runtimeErrors.length > 0
    ? `### Runtime Errors\n${runtimeErrors
        .map((e) => `- ${e.message}`)
        .join("\n")}`
    : ""

  const errorList = [compileList, runtimeList].filter(Boolean).join("\n\n")

  const fileList = files
    .map((f) => `### ${f.name}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n")

  const strategy = getStrategyForAttempt(attempt, { compileErrors, runtimeErrors })

  // Guidance based on error types
  let guidance = ""
  if (compileErrors.length > 0) {
    guidance += `\n### Compile Error Guidance\n- Check that all imports exist and paths are correct.\n- Verify syntax: matching brackets, correct JSX/HTML structure.\n- Ensure all referenced variables/functions are defined.`
  }
  if (runtimeErrors.length > 0) {
    guidance += `\n### Runtime Error Guidance\n- Add null/undefined checks before accessing properties.\n- Verify array methods are called on actual arrays.\n- Ensure event handlers are properly bound.`
  }
  if (attempt >= 2 && errors.length > 0) {
    guidance += `\n\n**WARNING:** A previous fix attempt for these errors failed. Take a fundamentally different approach this time — do NOT repeat the same fix pattern.`
  }

  return [
    {
      role: "system",
      content: `You are a code fix expert. ${strategy} Do NOT add markdown headings, code fences, or explanations — output ONLY the raw code with the "// file:" delimiter.`,
    },
    {
      role: "user",
      content: `Fix the following errors in the code:\n\n${errorList}\n\n## Current Files\n${fileList}\n${guidance}`,
    },
  ]
}

// --- Agent Tool-Using Mode ---

interface AgentPromptOpts {
  prompt: string
  language: Language
  framework?: Framework
  tools: ToolDefinition[]
}

export function buildAgentSystemPrompt(opts: AgentPromptOpts): string {
  const frameworkLabel = opts.framework === "vue" ? "Vue 3" : "React"
  const langName = opts.language === "typescript" ? "TypeScript" : "JavaScript"
  const ext = opts.framework === "vue" ? "vue" : opts.language === "typescript" ? "tsx" : "jsx"

  return `You are an expert frontend developer Agent with access to tools. Your goal is to generate complete, working ${frameworkLabel} + ${langName} code.

## Workflow
1. Analyze the user's request and plan the file structure
2. Write files one at a time using the writeFile tool
3. After writing all files, run runCheck to validate
4. If checks fail, read the problematic files, fix them, and re-check
5. Call done() when everything is working

## Rules
- Framework: ${frameworkLabel} with full ${langName}
- Styling: ${opts.framework === "vue" ? "Use <style scoped> with clean CSS. Do NOT use Tailwind." : "Tailwind CSS (utility-first)"}
- All components must be self-contained
- Export components as default
- Do NOT use external npm packages (no uuid, axios, lodash, etc.)
- Use only framework built-in APIs and native browser APIs
- Every state variable MUST have an initial value
- All array/object props MUST have default values
- Handle empty/null/undefined states explicitly

## Output Format
For each turn, output your thinking in plain text, then optionally ONE tool call in this exact format:

<tool_call>
{"name": "toolName", "arguments": {"key": "value"}}
</tool_call>

IMPORTANT:
- Each turn may contain at MOST one tool call
- Tool call JSON must be on a single line between the tags
- Write your thought first, then the tool call (if needed)
- Use done() to finish — do NOT stop without calling done()

## Available Tools

${formatToolsForPrompt(opts.tools)}

## Example Workflow

User: "Create a counter button component"

Your response:
I'll create a single Counter.${ext} component with useState for the count.

<tool_call>
{"name": "writeFile", "arguments": {"path": "Counter.${ext}", "content": "import { useState } from \\"react\\"\\n\\nexport default function Counter() {\\n  const [count, setCount] = useState(0)\\n\\n  return (\\n    <div className=\\"flex items-center gap-4 p-4\\">\\n      <button className=\\"px-4 py-2 bg-zinc-700 text-white rounded-lg\\" onClick={() => setCount(c => c - 1)}>-</button>\\n      <span className=\\"text-2xl font-bold\\">{count}</span>\\n      <button className=\\"px-4 py-2 bg-zinc-700 text-white rounded-lg\\" onClick={() => setCount(c => c + 1)}>+</button>\\n    </div>\\n  )\\n}"}}
</tool_call>

--- next turn (LLM receives tool result) ---

File written. Now let me check it.

<tool_call>
{"name": "runCheck", "arguments": {}}
</tool_call>

--- next turn ---

All checks passed. Task complete.

<tool_call>
{"name": "done", "arguments": {"summary": "Created Counter component with increment/decrement"}}
</tool_call>`
}

export function buildAgentMessages(
  opts: AgentPromptOpts,
  chatHistory?: ChatMessage[]
): Array<{ role: string; content: string }> {
  const msgs: Array<{ role: string; content: string }> = [
    { role: "system", content: buildAgentSystemPrompt(opts) },
  ]

  if (chatHistory && chatHistory.length > 0) {
    const recent = chatHistory.slice(-10)
    for (const msg of recent) {
      msgs.push({ role: msg.role, content: msg.content })
    }
  }

  msgs.push({ role: "user", content: opts.prompt })

  return msgs
}
