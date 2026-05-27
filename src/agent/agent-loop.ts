import type { ProviderConfig } from "./llm-provider"
import { streamGenerate } from "./llm-provider"
import { buildAgentMessages } from "./prompts"
import { VirtualFS } from "./virtual-fs"
import { createToolRegistry, type ToolDefinition } from "./tools"
import type { AgentStep, GeneratedFile, ChatMessage, ToolCall, ToolResult } from "../types"
import { useCodeGenStore } from "../stores/codeGenStore"

const MAX_TURNS = 15

// Parse a single <tool_call> tag from LLM output
// Returns the tool call if valid JSON, or an error message if malformed
function parseToolCall(content: string): { thought: string; toolCall: ToolCall | null; parseError?: string } {
  const tagStart = content.indexOf("<tool_call>")
  if (tagStart === -1) {
    return { thought: content.trim(), toolCall: null }
  }

  const tagEnd = content.indexOf("</tool_call>")
  if (tagEnd === -1) {
    // Unclosed tag — treat as no valid tool call
    return { thought: content.trim(), toolCall: null, parseError: "Missing closing </tool_call> tag" }
  }

  const thought = content.slice(0, tagStart).trim()
  const jsonStr = content.slice(tagStart + 11, tagEnd).trim()

  try {
    const parsed = JSON.parse(jsonStr)
    // Accept both formats: {"tool_name": "..."} and {"name": "...", "arguments": {...}}
    const toolCall: ToolCall = parsed.tool_name
      ? { name: parsed.tool_name, arguments: parsed.parameters ?? parsed.arguments ?? {} }
      : { name: parsed.name, arguments: parsed.arguments ?? {} }
    return { thought, toolCall }
  } catch (e) {
    const errMsg = e instanceof SyntaxError ? e.message : "Invalid JSON"
    return { thought, toolCall: null, parseError: `JSON parse error: ${errMsg}. Ensure newlines in content are escaped as \\n and double-quotes as \\\".` }
  }
}

// Build the "observation" text returned to LLM after a tool call
function buildObservation(result: ToolResult): string {
  if (result.success && result.data) {
    const MAX_DATA = 2000
    const truncated = result.data.length > MAX_DATA
      ? result.data.slice(0, MAX_DATA) + "\n... (truncated)"
      : result.data
    return `Tool result (success): ${result.message}\n\nContent:\n${truncated}`
  }
  return `Tool result (${result.success ? "success" : "failed"}): ${result.message}`
}

export async function* runAgentLoop(
  config: ProviderConfig,
  userPrompt: string,
  language: string,
  framework: string,
  chatHistory: ChatMessage[],
  signal?: AbortSignal
): AsyncGenerator<{
  type: "step" | "files" | "error" | "done"
  step?: AgentStep
  files?: GeneratedFile[]
  error?: string
}> {
  const fs = new VirtualFS()

  // Create tool registry
  const tools = createToolRegistry(fs, () => {
    // Return error messages from the store
    const state = useCodeGenStore.getState()
    return state.capturedErrors.map((e) => `[${e.source}] ${e.path}:${e.line} — ${e.message}`)
  })

  const toolMap = new Map<string, ToolDefinition>()
  for (const t of tools) {
    toolMap.set(t.name, t)
  }

  // Build initial messages
  const { prompt, language: lang, framework: fw } = {
    prompt: userPrompt,
    language: language as "typescript" | "javascript",
    framework: framework as "react" | "vue",
  }

  const messages = buildAgentMessages(
    { prompt, language: lang, framework: fw, tools },
    chatHistory
  )

  let turnCount = 0
  let totalTokens = 0
  const steps: AgentStep[] = []

  while (turnCount < MAX_TURNS) {
    // Check for cancellation
    if (signal?.aborted) break

    turnCount++

    let fullContent = ""
    let turnTokens = 0

    // Stream LLM response for this turn
    try {
      for await (const chunk of streamGenerate(config, messages, signal)) {
        fullContent += chunk.content
        turnTokens += chunk.tokens
      }
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === "AbortError"
      if (isAbort) break
      yield { type: "error", error: err instanceof Error ? err.message : "LLM call failed" }
      return
    }

    // Parse the response
    const { thought, toolCall, parseError } = parseToolCall(fullContent)

    // Accumulate token usage
    totalTokens += turnTokens

    // Create step
    const step: AgentStep = {
      id: `${Date.now()}-${turnCount}`,
      thought,
      toolCall,
      result: null,
      timestamp: Date.now(),
    }

    // Add assistant response to conversation history
    messages.push({ role: "assistant", content: fullContent.trim() })

    // If no tool call: either JSON was malformed (retry) or genuinely no tool call (done)
    if (!toolCall) {
      if (parseError) {
        // JSON parsing failed — tell LLM to fix the escaping and retry
        step.result = { success: false, message: parseError }
        steps.push(step)
        yield { type: "step", step }
        messages.push({ role: "user", content: `Tool result (failed): ${parseError}\n\nPlease re-output the tool call with properly escaped JSON. Make sure all newlines in code content are escaped as \\\\n and all double quotes as \\\\\".` })
        continue
      }
      // Genuinely no tool call — assume done
      step.result = { success: true, message: "No tool call — assuming done." }
      steps.push(step)
      yield { type: "step", step }
      break
    }

    // Execute tool
    const tool = toolMap.get(toolCall.name)
    if (!tool) {
      step.result = {
        success: false,
        message: `Unknown tool: ${toolCall.name}. Available: ${Array.from(toolMap.keys()).join(", ")}`,
      }
      steps.push(step)
      yield { type: "step", step }

      messages.push({ role: "user", content: `Tool result (failed): Unknown tool: ${toolCall.name}` })
      continue
    }

    const result = await tool.handler(toolCall.arguments)
    step.result = result
    steps.push(step)

    yield { type: "step", step }

    // Stream current files to code editor after each file operation
    if (toolCall.name === "writeFile" || toolCall.name === "readFile") {
      const currentFiles = fs.toGeneratedFiles()
      if (currentFiles.length > 0) {
        yield { type: "files", files: currentFiles }
      }
    }

    // If done, exit loop
    if (toolCall.name === "done") {
      break
    }

    // Feed the observation back to LLM for the next turn
    messages.push({ role: "user", content: buildObservation(result) })
  }

  // Final: yield all files from VirtualFS
  const files = fs.toGeneratedFiles()

  if (files.length > 0) {
    yield { type: "files", files }
  }

  // Update store with tokens
  if (totalTokens > 0) {
    useCodeGenStore.getState().setTokensUsed(
      useCodeGenStore.getState().tokensUsed + totalTokens
    )
  }

  yield { type: "done" }
}
