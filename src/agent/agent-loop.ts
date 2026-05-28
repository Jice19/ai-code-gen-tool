import type { ProviderConfig } from "./llm-provider"
import { streamGenerate } from "./llm-provider"
import { buildAgentMessages } from "./prompts"
import { VirtualFS } from "./virtual-fs"
import { createToolRegistry, type ToolDefinition } from "./tools"
import type { AgentStep, GeneratedFile, ChatMessage, ToolCall, ToolResult } from "../types"
import { useCodeGenStore } from "../stores/codeGenStore"

const MAX_TURNS = 15

// Parse <tool_call> tag from LLM output — uses XML-style format (no JSON escaping needed):
//   <tool_call name="writeFile" path="App.tsx">
//   code content here (no escaping needed)
//   </tool_call>
// Also supports: <tool_call name="runCheck" /> (self-closing)
// And old JSON format for backward compatibility
function parseToolCall(content: string): { thought: string; toolCall: ToolCall | null; parseError?: string } {
  // Try new XML-style format first
  const xmlTagRe = /<tool_call\b([^>]*)(?:\/>|>([\s\S]*?)<\/tool_call>)/
  const xmlMatch = content.match(xmlTagRe)

  if (xmlMatch) {
    const thought = content.slice(0, xmlMatch.index!).trim()
    const attrsStr = xmlMatch[1] || ""
    const body = (xmlMatch[2] || "").trim()

    // Extract name attribute
    const nameMatch = attrsStr.match(/name\s*=\s*"([^"]*)"/)
    if (!nameMatch) {
      return { thought: content.trim(), toolCall: null, parseError: "Missing name attribute in <tool_call> tag" }
    }

    const name = nameMatch[1]
    const args: Record<string, string> = {}

    // Extract other attributes
    const attrRe = /(\w+)\s*=\s*"([^"]*)"/g
    let m: RegExpExecArray | null
    while ((m = attrRe.exec(attrsStr)) !== null) {
      if (m[1] !== "name") {
        args[m[1]] = m[2]
      }
    }

    // Body content becomes the "content" argument
    if (body) {
      args["content"] = body
    }

    return { thought, toolCall: { name, arguments: args } }
  }

  // Fallback: try old JSON format <tool_call>{"name":...}</tool_call>
  const tagStart = content.indexOf("<tool_call>")
  if (tagStart !== -1) {
    const tagEnd = content.indexOf("</tool_call>")
    if (tagEnd !== -1) {
      const thought = content.slice(0, tagStart).trim()
      const jsonStr = content.slice(tagStart + 11, tagEnd).trim()
      try {
        const parsed = JSON.parse(jsonStr)
        const toolCall: ToolCall = parsed.tool_name
          ? { name: parsed.tool_name, arguments: parsed.parameters ?? parsed.arguments ?? {} }
          : { name: parsed.name, arguments: parsed.arguments ?? {} }
        return { thought, toolCall }
      } catch (e) {
        const errMsg = e instanceof SyntaxError ? e.message : "Invalid JSON"
        return { thought: content.trim(), toolCall: null, parseError: `JSON parse error: ${errMsg}. Use the XML format instead:\n<tool_call name="writeFile" path="App.tsx">\n<code here>\n</tool_call>` }
      }
    }
    return { thought: content.trim(), toolCall: null, parseError: "Missing closing </tool_call> tag" }
  }

  return { thought: content.trim(), toolCall: null }
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

    // If no tool call: JSON malformed (retry), first turn without actions (push), or genuinely done
    if (!toolCall) {
      if (parseError) {
        // JSON parsing failed — tell LLM to fix the escaping and retry
        step.result = { success: false, message: parseError }
        steps.push(step)
        yield { type: "step", step }
        messages.push({ role: "user", content: `Tool result (failed): ${parseError}\n\nPlease re-output the tool call with properly escaped JSON. Make sure all newlines in code content are escaped as \\\\n and all double quotes as \\\\\".` })
        continue
      }
      // No files written yet and no tool call — LLM is confused, push it to act
      if (fs.isEmpty()) {
        step.result = { success: false, message: "No tool call found. You must call writeFile to create files before finishing. Write a file first, then call done()." }
        steps.push(step)
        yield { type: "step", step }
        messages.push({ role: "user", content: `Tool result (failed): No tool call found in your response. You MUST output a <tool_call> tag. Example:\n\n<tool_call name="writeFile" path="App.tsx">\nimport { useState } from "react"\n\nexport default function App() {\n  return <div>Hello</div>\n}\n</tool_call>` })
        continue
      }
      // Files exist and no tool call — assume done
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
