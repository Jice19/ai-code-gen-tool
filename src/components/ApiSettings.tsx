import { useState } from "react"
import type { ProviderType } from "../agent"

interface ApiSettingsState {
  provider: ProviderType
  apiKey: string
  model: string
  baseUrl: string
}

const DEFAULT_MODELS: Record<ProviderType, string> = {
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-6",
  deepseek: "deepseek-chat",
}

const DEFAULT_BASE_URLS: Partial<Record<ProviderType, string>> = {
  deepseek: "https://api.deepseek.com",
}

function loadSettings(): ApiSettingsState {
  try {
    const raw = localStorage.getItem("ai-code-gen-settings")
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {
    provider: "openai",
    apiKey: "",
    model: DEFAULT_MODELS.openai,
    baseUrl: "",
  }
}

function saveSettings(s: ApiSettingsState) {
  localStorage.setItem("ai-code-gen-settings", JSON.stringify(s))
}

export function useApiSettings() {
  return useState<ApiSettingsState>(loadSettings)
}

export function ApiSettings({
  settings,
  setSettings,
}: {
  settings: ApiSettingsState
  setSettings: (s: ApiSettingsState) => void
}) {
  const handleChange = (patch: Partial<ApiSettingsState>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
  }

  return (
    <details className="group">
      <summary className="text-xs font-medium text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-400 transition-colors select-none">
        LLM Settings
      </summary>
      <div className="mt-3 flex flex-col gap-3 pl-1">
        <select
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
          value={settings.provider}
          onChange={(e) => {
            const provider = e.target.value as ProviderType
            handleChange({
              provider,
              model: DEFAULT_MODELS[provider],
              baseUrl: DEFAULT_BASE_URLS[provider] ?? "",
            })
          }}
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="deepseek">DeepSeek</option>
        </select>
        <input
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          placeholder="API Key"
          type="password"
          value={settings.apiKey}
          onChange={(e) => handleChange({ apiKey: e.target.value })}
        />
        <input
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          placeholder="Model (e.g. gpt-4o, claude-sonnet-4-6)"
          value={settings.model}
          onChange={(e) => handleChange({ model: e.target.value })}
        />
        <input
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          placeholder="Custom Base URL (optional)"
          value={settings.baseUrl}
          onChange={(e) => handleChange({ baseUrl: e.target.value })}
        />
      </div>
    </details>
  )
}

export type { ApiSettingsState }
