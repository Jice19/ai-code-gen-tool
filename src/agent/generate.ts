import { streamGenerate, buildMessages, buildChatMessages } from "./index"
import type { ProviderConfig } from "./index"
import { useCodeGenStore } from "../stores/codeGenStore"
import type { GeneratedFile, ChatMessage } from "../types"

const FILE_DELIMITER = /^\/\/ file: (.+)$/m

function parseGeneratedFiles(
  fullContent: string,
  language: string,
  framework?: string
): GeneratedFile[] {
  const ext =
    framework === "vue" ? "vue" : language === "typescript" ? "tsx" : "jsx"

  // Split by the "// file:" delimiter
  const parts = fullContent.split(FILE_DELIMITER)

  if (parts.length === 1) {
    // Single file — no delimiter found
    const nameMatch =
      fullContent.match(/function\s+(\w+)/) ??
      fullContent.match(/const\s+(\w+)/) ??
      fullContent.match(/defineComponent\(\s*["'](\w+)["']/) ??
      fullContent.match(/export\s+default\s*\{/)
    const componentName = nameMatch?.[1] ?? "GeneratedComponent"

    return [
      {
        name: `${componentName}.${ext}`,
        content: fullContent.trim(),
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
          content: fullContent.trim(),
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
