const COST_PER_1M_OUTPUT: Record<string, number> = {
  // OpenAI
  "gpt-4o": 10,
  "gpt-4o-mini": 0.6,
  "gpt-4-turbo": 30,
  "gpt-4": 60,
  // Anthropic
  "claude-sonnet-4-6": 15,
  "claude-opus-4-6": 75,
  "claude-haiku-4-5": 4,
  "claude-sonnet-4-5": 15,
  "claude-3-5-sonnet": 15,
  "claude-3-opus": 75,
  "claude-3-haiku": 1.25,
  // DeepSeek
  "deepseek-chat": 1.1,
  "deepseek-reasoner": 2.19,
}

export function estimateCost(model: string, tokens: number): number {
  // Find exact match first
  if (COST_PER_1M_OUTPUT[model] !== undefined) {
    return (tokens / 1_000_000) * COST_PER_1M_OUTPUT[model]
  }
  // Try partial match
  for (const [key, cost] of Object.entries(COST_PER_1M_OUTPUT)) {
    if (model.includes(key) || key.includes(model)) {
      return (tokens / 1_000_000) * cost
    }
  }
  // Default estimate ~$3/1M
  return (tokens / 1_000_000) * 3
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function formatCost(dollars: number): string {
  if (dollars >= 1) return `$${dollars.toFixed(2)}`
  if (dollars >= 0.01) return `${(dollars * 100).toFixed(1)}¢`
  return "<0.1¢"
}
