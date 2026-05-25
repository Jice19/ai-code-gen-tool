import { streamGenerate, buildMessages } from "./index"
import type { ProviderConfig } from "./index"
import { useCodeGenStore } from "../stores/codeGenStore"
import type { GeneratedFile, ChatMessage } from "../types"

export async function generateCode(
  config: ProviderConfig,
  onChunk?: (text: string) => void
): Promise<{ files: GeneratedFile[]; tokensUsed: number }> {
  const state = useCodeGenStore.getState()
  const { prompt, framework, language, generatedFiles, chatMessages } = state

  const previousCode = generatedFiles.length > 0
    ? generatedFiles.map((f) => f.content).join("\n\n")
    : undefined

  const messages = buildMessages(
    { prompt, framework, language, previousCode },
    chatMessages.length > 0 ? chatMessages : undefined
  )

  let fullContent = ""
  let tokensUsed = 0

  for await (const chunk of streamGenerate(config, messages)) {
    fullContent += chunk.content
    tokensUsed += chunk.tokens
    onChunk?.(chunk.content)
  }

  const ext = language === "typescript" ? "tsx" : "jsx"

  // Extract component name from content
  const nameMatch = fullContent.match(/function\s+(\w+)/) ?? fullContent.match(/const\s+(\w+)/)
  const componentName = nameMatch?.[1] ?? "GeneratedComponent"

  return {
    files: [
      {
        name: `${componentName}.${ext}`,
        content: fullContent,
        language: language === "typescript" ? "typescript" : "javascript",
      },
    ],
    tokensUsed,
  }
}

export async function runGeneration(
  config: ProviderConfig,
  userMessage?: string
) {
  const store = useCodeGenStore.getState()

  // Add user message to chat if provided
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
  store.setGeneratedFiles([])

  try {
    const result = await generateCode(config, (chunk) => {
      useCodeGenStore.getState().appendStreamingContent(chunk)
    })

    store.setGeneratedFiles(result.files)
    store.setTokensUsed(
      useCodeGenStore.getState().tokensUsed + result.tokensUsed
    )

    // Add assistant response to chat
    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: `Generated ${result.files[0]?.name}. ${result.tokensUsed} tokens used.`,
      timestamp: Date.now(),
    }
    store.addChatMessage(assistantMsg)
  } catch (err) {
    const errorMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: `Error: ${err instanceof Error ? err.message : "Generation failed"}`,
      timestamp: Date.now(),
    }
    store.addChatMessage(errorMsg)
  } finally {
    store.setIsGenerating(false)
  }
}
