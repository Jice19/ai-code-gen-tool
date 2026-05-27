import { useState, useCallback, useEffect, useRef } from "react"
import { InputPanel, ApiSettings, useApiSettings, CodeEditor, PreviewPanel, ChatPanel, ExportToolbar, ToastContainer } from "./components"
import { useCodeGenStore } from "./stores/codeGenStore"
import { useToastStore } from "./stores/toastStore"
import { runGeneration } from "./agent"
import type { ProviderConfig } from "./agent"
import { useKeyboardShortcuts } from "./lib/keybindings"
import { cn } from "./lib/utils"

const SIDEBAR_W = 320

function App() {
  const [settings, setSettings] = useApiSettings()
  const [centerView, setCenterView] = useState<"code" | "preview">("code")
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const mode = useCodeGenStore((s) => s.mode)
  const isGenerating = useCodeGenStore((s) => s.isGenerating)
  const wasGeneratingRef = useRef(isGenerating)

  // Auto-switch to Preview when generation completes
  useEffect(() => {
    if (wasGeneratingRef.current && !isGenerating) {
      setCenterView("preview")
    }
    wasGeneratingRef.current = isGenerating
  }, [isGenerating])

  const resolveApiKey = useCallback((): string => {
    if (settings.apiKey) return settings.apiKey
    return (import.meta.env.VITE_API_KEY as string | undefined) ?? ""
  }, [settings.apiKey])

  const buildConfig = useCallback((): ProviderConfig => ({
    type: settings.provider,
    apiKey: resolveApiKey(),
    model: settings.model,
    baseUrl: settings.baseUrl || undefined,
  }), [settings, resolveApiKey])

  const handleGenerate = useCallback(() => {
    if (!resolveApiKey()) {
      useToastStore.getState().addToast("error", "Please configure your LLM API key in Settings first.")
      return
    }
    if (mode === "chat") {
      const prompt = useCodeGenStore.getState().prompt
      if (!prompt.trim()) return
      runGeneration(buildConfig(), prompt.trim())
      useCodeGenStore.getState().setPrompt("")
    } else {
      setCenterView("code")
      runGeneration(buildConfig())
    }
  }, [resolveApiKey, buildConfig, mode])

  const handleChatSend = useCallback((message: string) => {
    if (!resolveApiKey()) {
      useToastStore.getState().addToast("error", "Please configure your LLM API key in Settings first.")
      return
    }
    runGeneration(buildConfig(), message)
  }, [resolveApiKey, buildConfig])

  const handleCancel = useCallback(() => {
    useCodeGenStore.getState().cancelGeneration()
  }, [])

  const handleFocusInput = useCallback(() => {
    const el = document.getElementById("prompt-input")
    el?.focus()
  }, [])

  useKeyboardShortcuts({
    onGenerate: handleGenerate,
    onCancel: handleCancel,
    onFocusInput: handleFocusInput,
    isGenerating,
  })

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-1"
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            title={leftCollapsed ? "Show input panel" : "Hide input panel"}
          >
            {leftCollapsed ? "☰" : "◀"}
          </button>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">AI Code Gen</h1>
            <p className="text-[10px] text-zinc-500">
              Generate components from natural language
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-zinc-700 hidden sm:inline">
            {/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl"}+Enter to generate
          </span>
          <span className="text-xs text-zinc-600">
            {settings.provider} / {settings.model || "no model"}
          </span>
          <button
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-1"
            onClick={() => setRightCollapsed(!rightCollapsed)}
            title={rightCollapsed ? "Show chat panel" : "Hide chat panel"}
          >
            {rightCollapsed ? "◀" : "▶"}
          </button>
        </div>
      </header>

      <main className="flex-1 flex min-h-0">
        {/* Left Sidebar — Input */}
        <aside
          className={cn(
            "border-r border-zinc-800 flex flex-col shrink-0 min-h-0 transition-all duration-200 overflow-hidden",
            leftCollapsed ? "w-0 border-r-0" : ""
          )}
          style={{ width: leftCollapsed ? 0 : SIDEBAR_W }}
        >
          <div className="p-4 flex flex-col gap-4" style={{ minWidth: SIDEBAR_W }}>
            <InputPanel onGenerate={handleGenerate} />
          </div>
          <div className="mt-auto p-4 border-t border-zinc-800" style={{ minWidth: SIDEBAR_W }}>
            <ApiSettings settings={settings} setSettings={setSettings} />
          </div>
        </aside>

        {/* Center — Editor + Preview */}
        <section className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex items-center border-b border-zinc-800 shrink-0">
            <button
              className={cn(
                "px-4 py-2 text-xs font-medium transition-colors",
                centerView === "code"
                  ? "text-zinc-100 border-b-2 border-zinc-400"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
              onClick={() => setCenterView("code")}
            >
              Code
            </button>
            <button
              className={cn(
                "px-4 py-2 text-xs font-medium transition-colors",
                centerView === "preview"
                  ? "text-zinc-100 border-b-2 border-zinc-400"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
              onClick={() => setCenterView("preview")}
            >
              Preview
            </button>
            <div className="ml-auto">
              <ExportToolbar />
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {centerView === "code" ? <CodeEditor /> : <PreviewPanel />}
          </div>
        </section>

        {/* Right Sidebar — Chat */}
        <aside
          className={cn(
            "border-l border-zinc-800 flex flex-col p-4 shrink-0 min-h-0 transition-all duration-200 overflow-hidden",
            rightCollapsed ? "w-0 border-l-0 p-0" : ""
          )}
          style={{ width: rightCollapsed ? 0 : SIDEBAR_W }}
        >
          <div style={{ minWidth: SIDEBAR_W - 32 }}>
            <ChatPanel onSend={handleChatSend} />
          </div>
        </aside>
      </main>
      <ToastContainer />
    </div>
  )
}

export default App
