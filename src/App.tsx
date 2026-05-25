import { useState, useCallback } from "react"
import { InputPanel, ApiSettings, useApiSettings, CodeEditor, PreviewPanel, ChatPanel, ExportToolbar } from "./components"
import { runGeneration } from "./agent"
import type { ProviderConfig } from "./agent"

function App() {
  const [settings, setSettings] = useApiSettings()
  const [centerView, setCenterView] = useState<"code" | "preview">("code")

  const buildConfig = useCallback((): ProviderConfig => ({
    type: settings.provider,
    apiKey: settings.apiKey,
    model: settings.model,
    baseUrl: settings.baseUrl || undefined,
  }), [settings])

  const handleGenerate = useCallback(() => {
    if (!settings.apiKey) {
      alert("Please configure your LLM API key in Settings first.")
      return
    }
    setCenterView("code")
    runGeneration(buildConfig())
  }, [settings, buildConfig])

  const handleChatSend = useCallback((message: string) => {
    if (!settings.apiKey) {
      alert("Please configure your LLM API key in Settings first.")
      return
    }
    runGeneration(buildConfig(), message)
  }, [settings, buildConfig])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">AI Code Gen</h1>
          <p className="text-xs text-zinc-500">
            Generate React components from natural language
          </p>
        </div>
        <div className="text-xs text-zinc-600">
          {settings.provider} / {settings.model || "no model"}
        </div>
      </header>

      <main className="flex-1 flex min-h-0">
        {/* Left Sidebar — Input */}
        <aside className="w-80 border-r border-zinc-800 flex flex-col shrink-0">
          <div className="p-4 flex flex-col gap-4">
            <InputPanel onGenerate={handleGenerate} />
          </div>
          <div className="mt-auto p-4 border-t border-zinc-800">
            <ApiSettings settings={settings} setSettings={setSettings} />
          </div>
        </aside>

        {/* Center — Editor + Preview */}
        <section className="flex-1 flex flex-col min-w-0">
          {/* Toggle tabs */}
          <div className="flex items-center border-b border-zinc-800 shrink-0">
            <button
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                centerView === "code"
                  ? "text-zinc-100 border-b-2 border-zinc-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              onClick={() => setCenterView("code")}
            >
              Code
            </button>
            <button
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                centerView === "preview"
                  ? "text-zinc-100 border-b-2 border-zinc-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
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
        <aside className="w-80 border-l border-zinc-800 flex flex-col p-4 shrink-0">
          <ChatPanel onSend={handleChatSend} />
        </aside>
      </main>
    </div>
  )
}

export default App
