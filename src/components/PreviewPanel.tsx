import {
  SandpackProvider,
  SandpackPreview,
  SandpackCodeEditor,
} from "@codesandbox/sandpack-react"
import { useCodeGenStore } from "../stores/codeGenStore"
import { useState } from "react"

export function PreviewPanel() {
  const { generatedFiles, activeFileIndex } = useCodeGenStore()
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview")

  if (generatedFiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-500">
        暂无组件可预览
      </div>
    )
  }

  const activeFile = generatedFiles[activeFileIndex] ?? generatedFiles[0]
  const isTsx = activeFile.name.endsWith(".tsx") || activeFile.name.endsWith(".ts")

  const appFileName = isTsx ? "App.tsx" : "App.jsx"
  const files: Record<string, string> = {
    [appFileName]: activeFile.content,
  }

  // Add index.tsx entry point if the generated component doesn't include one
  if (!activeFile.content.includes("createRoot") && !activeFile.content.includes("ReactDOM")) {
    files["index.tsx"] = `import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./styles.css"

const rootEl = document.getElementById("root")
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl)
  root.render(<React.StrictMode><App /></React.StrictMode>)
}`
  }

  // Simple CSS — the Tailwind CDN script handles utility classes automatically
  files["styles.css"] = `* {
  box-sizing: border-box;
}
body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}`

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-800 shrink-0">
        <button
          className={`px-3 py-1 text-xs rounded transition-colors ${
            viewMode === "preview"
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
          onClick={() => setViewMode("preview")}
        >
          Preview
        </button>
        <button
          className={`px-3 py-1 text-xs rounded transition-colors ${
            viewMode === "code"
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
          onClick={() => setViewMode("code")}
        >
          Source
        </button>
      </div>
      <div className="flex-1 min-h-0 relative">
        <SandpackProvider
          template="react"
          files={files}
          theme="dark"
          options={{
            externalResources: ["https://cdn.tailwindcss.com"],
          }}
        >
          {viewMode === "preview" ? (
            <SandpackPreview
              showNavigator={false}
              showRefreshButton
              style={{ height: "100%" }}
            />
          ) : (
            <SandpackCodeEditor
              showLineNumbers
              style={{ height: "100%" }}
            />
          )}
        </SandpackProvider>
      </div>
    </div>
  )
}
