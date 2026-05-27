import { streamGenerate, buildMessages, buildChatMessages, buildFixPrompt } from "./index"
import type { ProviderConfig } from "./index"
import { useCodeGenStore } from "../stores/codeGenStore"
import type { GeneratedFile, ChatMessage, CapturedError } from "../types"

let lastProviderConfig: ProviderConfig | null = null
export function getLastConfig(): ProviderConfig | null {
  return lastProviderConfig
}

const FILE_DELIMITER = /^\/\/ file: (.+)$/m

function stripMarkdownFences(content: string): string {
  // Remove leading code fence (e.g. ```tsx, ```vue, ```typescript)
  let cleaned = content.replace(/^```[\w-]*\s*\n?/, "")
  // Remove trailing code fence
  cleaned = cleaned.replace(/\n?```\s*$/, "")
  return cleaned.trim()
}

function stripPlanComments(content: string): string {
  // Remove "// plan:" comment lines from the beginning of the output
  return content.replace(/^\/\/ plan:.*\n/gm, "").trim()
}

// Incrementally parse streaming content into partial file views
function incrementalParse(content: string): GeneratedFile[] {
  const lines = content.split("\n")
  const files: GeneratedFile[] = []
  let currentName = ""
  let currentLines: string[] = []

  // Skip plan comments at the very beginning
  let i = 0
  while (i < lines.length && lines[i].trimStart().startsWith("// plan:")) {
    i++
  }

  for (; i < lines.length; i++) {
    const match = lines[i].match(/^\/\/ file: (.+)$/)
    if (match) {
      if (currentName && currentLines.length > 0) {
        files.push({
          name: currentName,
          content: currentLines.join("\n"),
          language: inferLanguage(currentName),
        })
      }
      currentName = match[1].trim()
      currentLines = []
    } else if (currentName) {
      currentLines.push(lines[i])
    } else {
      // Before first delimiter — all lines belong to a default file
      currentName = currentName || "_streaming"
      currentLines.push(lines[i])
    }
  }

  // Last file (still streaming or single file)
  if (currentLines.length > 0) {
    files.push({
      name: currentName === "_streaming" ? "Component.tsx" : currentName,
      content: currentLines.join("\n"),
      language: inferLanguage(currentName),
    })
  }

  return files
}

function inferLanguage(filename: string): string {
  const ext = filename.split(".").pop() ?? ""
  const langMap: Record<string, string> = {
    tsx: "typescript", ts: "typescript",
    jsx: "javascript", js: "javascript",
    vue: "html", css: "css",
  }
  return langMap[ext] ?? "text"
}

// Extract code blocks from markdown when LLM ignores "no markdown" instructions
function extractMarkdownCodeBlocks(content: string): { filename: string; content: string; language: string }[] {
  const blocks: { filename: string; content: string; language: string }[] = []
  // Match ```lang\n...\n``` with optional filename hints from preceding headings
  const codeBlockRe = /```(\w*)\s*\n([\s\S]*?)```/g
  let match: RegExpExecArray | null

  while ((match = codeBlockRe.exec(content)) !== null) {
    const lang = match[1] || ""
    const code = match[2].trim()
    if (!code) continue

    // Try to extract filename from a markdown heading before this block
    const beforeBlock = content.slice(0, match.index)
    const headingMatch = beforeBlock.match(/###?\s*`?([\w./-]+\.\w+)`?[\s\n]*$/)

    const ext = lang || ""
    const filename = headingMatch?.[1] || `Component.${ext}`

    const langMap: Record<string, string> = {
      tsx: "typescript", ts: "typescript", jsx: "javascript", js: "javascript",
      vue: "html", css: "css",
    }
    const fileLanguage = langMap[lang] ?? "text"

    blocks.push({ filename, content: code, language: fileLanguage })
  }

  return blocks
}

function parseGeneratedFiles(
  fullContent: string,
  language: string,
  framework?: string
): GeneratedFile[] {
  const ext =
    framework === "vue" ? "vue" : language === "typescript" ? "tsx" : "jsx"

  // Strip markdown code fences that some LLMs output despite instructions
  const cleaned = stripMarkdownFences(fullContent)

  // Split by the "// file:" delimiter
  const parts = cleaned.split(FILE_DELIMITER)

  if (parts.length === 1) {
    // No delimiter found — try extracting fenced code blocks as fallback
    const codeBlocks = extractMarkdownCodeBlocks(fullContent)
    if (codeBlocks.length > 0) {
      return codeBlocks.map((b) => ({
        name: b.filename,
        content: b.content,
        language: b.language,
      }))
    }

    // Single file — no delimiter and no code blocks
    const stripped = stripPlanComments(cleaned)
    const nameMatch =
      stripped.match(/function\s+(\w+)/) ??
      stripped.match(/const\s+(\w+)/) ??
      stripped.match(/defineComponent\(\s*["'](\w+)["']/) ??
      stripped.match(/export\s+default\s*\{/)
    const componentName = nameMatch?.[1] ?? "GeneratedComponent"

    return [
      {
        name: `${componentName}.${ext}`,
        content: stripped,
        language: language === "typescript" ? "typescript" : "javascript",
      },
    ]
  }

  // Multi-file: parts[0] is empty or discarded content before first delimiter,
  // then pairs of [filename, content] follow
  const files: GeneratedFile[] = []
  // Skip the first element (content before any delimiter)
  for (let i = 1; i < parts.length; i += 2) {
    const rawName = parts[i]?.trim()
    const content = parts[i + 1]?.trim()
    if (!rawName || !content) continue

    // Determine language from file extension
    const fileExt = rawName.split(".").pop() ?? ext
    const langMap: Record<string, string> = {
      tsx: "typescript",
      ts: "typescript",
      jsx: "javascript",
      js: "javascript",
      vue: "html",
      css: "css",
    }
    const fileLanguage = langMap[fileExt] ?? "text"

    files.push({
      name: rawName,
      content,
      language: fileLanguage,
    })
  }

  return files.length > 0
    ? files
    : [
        {
          name: `GeneratedComponent.${ext}`,
          content: stripPlanComments(cleaned),
          language: framework === "vue" ? "html" : language === "typescript" ? "typescript" : "javascript",
        },
      ]
}

export async function generateCode(
  config: ProviderConfig,
  onChunk?: (text: string) => void,
  signal?: AbortSignal
): Promise<{ files: GeneratedFile[]; tokensUsed: number }> {
  const state = useCodeGenStore.getState()
  const { prompt, language, framework, generatedFiles, chatMessages } = state

  const previousCode = generatedFiles.length > 0
    ? generatedFiles.map((f) => f.content).join("\n\n")
    : undefined

  const messages = buildMessages(
    { prompt, language, framework, previousCode },
    chatMessages.length > 0 ? chatMessages : undefined
  )

  let fullContent = ""
  let tokensUsed = 0

  for await (const chunk of streamGenerate(config, messages, signal)) {
    fullContent += chunk.content
    tokensUsed += chunk.tokens
    onChunk?.(chunk.content)

    // Incrementally parse files so tabs appear during streaming
    const partialFiles = incrementalParse(fullContent)
    if (partialFiles.length > 0) {
      useCodeGenStore.getState().setStreamingFiles(partialFiles)
    }
  }

  const files = parseGeneratedFiles(fullContent, language, framework)

  return { files, tokensUsed }
}

async function runChatGeneration(
  config: ProviderConfig,
  userMessage: string
) {
  const store = useCodeGenStore.getState()
  const { chatMessages } = store

  const messages = buildChatMessages(userMessage, chatMessages)

  const assistantId = (Date.now() + 1).toString()
  const assistantMsg: ChatMessage = {
    id: assistantId,
    role: "assistant",
    content: "",
    timestamp: Date.now(),
  }
  store.addChatMessage(assistantMsg)

  const abortController = new AbortController()
  store._setAbortController(abortController)

  try {
    for await (const chunk of streamGenerate(config, messages, abortController.signal)) {
      useCodeGenStore.getState().appendChatContent(assistantId, chunk.content)
    }
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === "AbortError"
    if (isAbort) {
      store.appendChatContent(assistantId, "\n\n*[Generation cancelled.]*")
    } else {
      store.appendChatContent(
        assistantId,
        `\n\n*[Error: ${err instanceof Error ? err.message : "Generation failed"}]*`
      )
    }
  } finally {
    store.setIsGenerating(false)
    store._setAbortController(null)
  }
}

export async function runGeneration(
  config: ProviderConfig,
  userMessage?: string
) {
  lastProviderConfig = config
  const store = useCodeGenStore.getState()
  const { mode } = store

  // Chat mode: stream text response directly to ChatPanel
  if (mode === "chat") {
    if (!userMessage) return
    const chatMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      timestamp: Date.now(),
    }
    store.addChatMessage(chatMsg)
    store.setIsGenerating(true)
    await runChatGeneration(config, userMessage)
    return
  }

  // Code mode: existing behavior
  if (userMessage) {
    const chatMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      timestamp: Date.now(),
    }
    store.addChatMessage(chatMsg)
  }

  store.setIsGenerating(true)
  store.clearGeneration()

  const abortController = new AbortController()
  store._setAbortController(abortController)

  try {
    const result = await generateCode(config, (chunk) => {
      useCodeGenStore.getState().appendStreamingContent(chunk)
    }, abortController.signal)

    // Save current files to history before replacing (always, including the very first generation)
    store.pushToHistory(result.files)
    store.setGeneratedFiles(result.files)
    store.setTokensUsed(
      useCodeGenStore.getState().tokensUsed + result.tokensUsed
    )

    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: `Generated ${result.files.length} file${result.files.length > 1 ? "s" : ""}: ${result.files.map(f => f.name).join(", ")}. ${result.tokensUsed} tokens used.`,
      timestamp: Date.now(),
    }
    store.addChatMessage(assistantMsg)
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === "AbortError"
    const errorMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: isAbort
        ? "Generation cancelled."
        : `Error: ${err instanceof Error ? err.message : "Generation failed"}`,
      timestamp: Date.now(),
    }
    store.addChatMessage(errorMsg)
  } finally {
    store.setIsGenerating(false)
    store._setAbortController(null)
  }
}

export async function runSelfHealingFix(
  config: ProviderConfig,
  errors: CapturedError[],
  currentFiles: GeneratedFile[]
): Promise<{ files: GeneratedFile[]; tokensUsed: number }> {
  const store = useCodeGenStore.getState()
  const attempt = store.retryCount

  const messages = buildFixPrompt(errors, currentFiles, attempt)

  let fullContent = ""
  let tokensUsed = 0

  for await (const chunk of streamGenerate(config, messages)) {
    fullContent += chunk.content
    tokensUsed += chunk.tokens
  }

  const files = parseGeneratedFiles(
    fullContent,
    store.language,
    store.framework
  )

  const assistantMsg: ChatMessage = {
    id: Date.now().toString(),
    role: "assistant",
    content: `[Self-healing] Fixed ${errors.length} error${errors.length > 1 ? "s" : ""}. ${tokensUsed} tokens used.`,
    timestamp: Date.now(),
  }
  store.addChatMessage(assistantMsg)

  return { files, tokensUsed }
}
