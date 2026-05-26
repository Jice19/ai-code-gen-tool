import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
} from "@codesandbox/sandpack-react"
import { useCodeGenStore } from "../stores/codeGenStore"
import { cn } from "../lib/utils"
import { useState } from "react"

function buildSandpackFiles(
  generatedFiles: { name: string; content: string }[],
  framework: string
): { files: Record<string, string>; template: string } {
  const files: Record<string, string> = {}

  // Add all generated files at root level
  for (const f of generatedFiles) {
    files[`/${f.name}`] = f.content
  }

  files["/styles.css"] =
    "body { margin: 0; font-family: system-ui, sans-serif; } * { box-sizing: border-box; }"

  if (framework === "vue") {
    // vite-vue-ts template expects files under /src/
    // The template's /src/main.ts already imports ./App.vue and mounts it
    // We override /src/App.vue with the main generated component
    const mainVue = generatedFiles.find((f) => f.name.endsWith(".vue"))

    if (mainVue) {
      // Place main component at the template entry point path
      files["/src/App.vue"] = mainVue.content
    }

    // Place additional generated files under /src/ for correct import resolution
    for (const f of generatedFiles) {
      // Skip the main file — already placed as App.vue
      if (f === mainVue) continue
      files[`/src/${f.name}`] = f.content
    }

    return { files, template: "vite-vue-ts" }
  }

  // React: find the main component file
  const mainFile = generatedFiles.find(
    (f) => f.name.endsWith(".tsx") || f.name.endsWith(".jsx")
  ) ?? generatedFiles[0]
  const mainName = mainFile ? mainFile.name : "App.tsx"
  const ext = mainName.endsWith(".tsx") || mainName.endsWith(".ts") ? "tsx" : "jsx"

  files[`/index.${ext}`] = `import App from "./${mainName}"
import { createRoot } from "react-dom/client"

createRoot(document.getElementById("root")!).render(<App />)
`
  return { files, template: "react-ts" }
}

export function PreviewPanel() {
  const { generatedFiles, framework } = useCodeGenStore()
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview")

  if (generatedFiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-zinc-500">
        暂无组件可预览
      </div>
    )
  }

  const { files, template } = buildSandpackFiles(generatedFiles, framework)

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-800 shrink-0">
        <button
          className={cn(
            "px-3 py-1 text-xs rounded transition-colors",
            viewMode === "preview"
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300"
          )}
          onClick={() => setViewMode("preview")}
        >
          Preview
        </button>
        <button
          className={cn(
            "px-3 py-1 text-xs rounded transition-colors",
            viewMode === "code"
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-500 hover:text-zinc-300"
          )}
          onClick={() => setViewMode("code")}
        >
          Source
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <SandpackProvider
          template={template as "react-ts" | "vite-vue-ts"}
          files={files}
          theme="dark"
          options={{
            externalResources: ["https://cdn.tailwindcss.com"],
          }}
        >
          <SandpackLayout
            style={{
              height: "100%",
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
