import { useRef, useCallback } from "react"
import Editor, { type OnMount } from "@monaco-editor/react"
import type { editor } from "monaco-editor"
import { useCodeGenStore } from "../stores/codeGenStore"

export function CodeEditor() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const { generatedFiles, activeFileIndex, streamingContent, isGenerating } =
    useCodeGenStore()

  const activeFile = generatedFiles[activeFileIndex]
  const displayContent = activeFile
    ? activeFile.content
    : streamingContent || "// Your generated code will appear here..."

  const language = activeFile?.language ?? "typescript"

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor
  }, [])

  return (
    <div className="flex flex-col h-full">
      {generatedFiles.length > 0 && (
        <div className="flex gap-1 px-4 py-2 border-b border-zinc-800 overflow-x-auto">
          {generatedFiles.map((file, i) => (
            <FileTab key={file.name} name={file.name} index={i} />
          ))}
        </div>
      )}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={language}
          value={displayContent}
          theme="vs-dark"
          onMount={handleMount}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            padding: { top: 16 },
            automaticLayout: true,
          }}
          loading={
            <div className="flex items-center justify-center h-full text-sm text-zinc-500">
              Loading editor...
            </div>
          }
        />
        {isGenerating && (
          <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-zinc-800 rounded-full px-3 py-1.5 text-xs text-zinc-300">
            <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Streaming...
          </div>
        )}
        {!activeFile && !isGenerating && !streamingContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-sm text-zinc-500">Generated code will appear here</span>
          </div>
        )}
      </div>
    </div>
  )
}

function FileTab({ name, index }: { name: string; index: number }) {
  const { activeFileIndex, setActiveFileIndex } = useCodeGenStore()
  const isActive = activeFileIndex === index

  return (
    <button
      className={`px-3 py-1 text-xs rounded-t-md transition-colors ${
        isActive
          ? "bg-zinc-800 text-zinc-100"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
      }`}
      onClick={() => setActiveFileIndex(index)}
    >
      {name}
    </button>
  )
}
