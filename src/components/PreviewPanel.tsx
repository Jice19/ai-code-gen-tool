import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
} from "@codesandbox/sandpack-react"
import { useCodeGenStore } from "../stores/codeGenStore"
import { useState, useRef, useLayoutEffect } from "react"

export function PreviewPanel() {
  const { generatedFiles, activeFileIndex } = useCodeGenStore()
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview")
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return
    const update = () => setHeight(el.clientHeight)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (generatedFiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-500">
        暂无组件可预览
      </div>
    )
  }

  const activeFile = generatedFiles[activeFileIndex] ?? generatedFiles[0]
  const isTsx = activeFile.name.endsWith(".tsx") || activeFile.name.endsWith(".ts")

  const files: Record<string, string> = {
    "/App.tsx": activeFile.content,
    "/styles.css":
      "body { margin: 0; font-family: system-ui, sans-serif; } * { box-sizing: border-box; }",
  }

  const ext = isTsx ? "tsx" : "jsx"
  files[`/index.${ext}`] = `import App from "./App"
import { createRoot } from "react-dom/client"

createRoot(document.getElementById("root")!).render(<App />)
`

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
      <div ref={contentRef} className="flex-1 min-h-0">
        <SandpackProvider
          template="react-ts"
          files={files}
          theme="dark"
          options={{
            externalResources: ["https://cdn.tailwindcss.com"],
          }}
        >
          <SandpackLayout
            style={{
              height: height > 0 ? `${height}px` : "100%",
              border: "none",
              borderRadius: 0,
            }}
          >
            {viewMode === "preview" ? (
              <SandpackPreview showNavigator={false} showRefreshButton />
            ) : (
              <SandpackCodeEditor showLineNumbers />
            )}
          </SandpackLayout>
        </SandpackProvider>
      </div>
    </div>
  )
}
