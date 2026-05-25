export type ProviderType = "openai" | "anthropic"

export interface ProviderConfig {
  type: ProviderType
  apiKey: string
  model: string
  baseUrl?: string
}

function getHeaders(config: ProviderConfig): Record<string, string> {
  if (config.type === "anthropic") {
    return {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    }
  }
  return {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  }
}

function getEndpoint(config: ProviderConfig): string {
  if (config.type === "anthropic") {
    return `${config.baseUrl ?? "https://api.anthropic.com"}/v1/messages`
  }
  return `${config.baseUrl ?? "https://api.openai.com"}/v1/chat/completions`
}

function buildBody(
  config: ProviderConfig,
  messages: Array<{ role: string; content: string }>
): string {
  if (config.type === "anthropic") {
    const systemMsg = messages.find((m) => m.role === "system")
    const otherMsgs = messages.filter((m) => m.role !== "system")
    return JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      system: systemMsg?.content,
      messages: otherMsgs.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    })
  }
  return JSON.stringify({
    model: config.model,
    messages,
    max_tokens: 4096,
    stream: true,
  })
}

function extractChunk(config: ProviderConfig, parsed: Record<string, unknown>): string {
  if (config.type === "anthropic") {
    const delta = (parsed as { delta?: { text?: string } })?.delta
    return delta?.text ?? (parsed as Record<string, unknown> & { content_block?: { text?: string } })?.content_block?.text ?? ""
  }
  const choices = (parsed as { choices?: Array<{ delta?: { content?: string } }> }).choices
  return choices?.[0]?.delta?.content ?? ""
}

function extractTokens(
  config: ProviderConfig,
  parsed: Record<string, unknown>
): number {
  if (config.type === "anthropic") {
    const usage = (parsed as { usage?: { output_tokens?: number } }).usage
    return usage?.output_tokens ?? 0
  }
  const usage = (parsed as { usage?: { completion_tokens?: number } }).usage
  return usage?.completion_tokens ?? 0
}

export async function* streamGenerate(
  config: ProviderConfig,
  messages: Array<{ role: string; content: string }>
): AsyncGenerator<{ content: string; tokens: number }> {
  const endpoint = getEndpoint(config)
  const body = buildBody(config, messages)

  const response = await fetch(endpoint, {
    method: "POST",
    headers: getHeaders(config),
    body,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`LLM API error ${response.status}: ${text}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error("Response body is not readable")

  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith("data: ")) continue

      const data = trimmed.slice(6)
      if (data === "[DONE]") continue

      try {
        const parsed = JSON.parse(data)
        const content = extractChunk(config, parsed)
        const tokens = extractTokens(config, parsed)
        if (content) {
          yield { content, tokens }
        }
      } catch {
        // Skip unparseable chunks
      }
    }
  }
}
