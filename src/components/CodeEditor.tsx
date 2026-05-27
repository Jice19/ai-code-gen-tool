import { useRef, useCallback, useEffect } from "react"
import Editor, { type OnMount } from "@monaco-editor/react"
import type { editor } from "monaco-editor"
import { useCodeGenStore } from "../stores/codeGenStore"
import { cn } from "../lib/utils"

export function CodeEditor() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ignoreNextChangeRef = useRef(false)

  const {
    generatedFiles,
    activeFileIndex,
    streamingContent,
    isGenerating,
    language: storeLanguage,
    updateFileContent,
    generationHistory,
    historyIndex,
    undoGeneration,
    redoGeneration,
    setGeneratedFiles,
  } = useCodeGenStore()

  const activeFile = generatedFiles[activeFileIndex]
  const displayContent = activeFile
    ? activeFile.content
    : streamingContent || "// Your generated code will appear here..."

  const language = activeFile?.language ?? storeLanguage

  // Auto-scroll to bottom during streaming generation
  useEffect(() => {
    if (!isGenerating || !editorRef.current) return
    const editor = editorRef.current
    const model = editor.getModel()
    if (!model) return
    const lastLine = model.getLineCount()
    editor.revealLine(lastLine)
  }, [displayContent, isGenerating])

  // When programmatic content changes (streaming, tab switch, new generation),
  // flag to ignore the next onDidChangeContent event
  useEffect(() => {
    ignoreNextChangeRef.current = true
  }, [activeFileIndex, displayContent])

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor
    const model = editor.getModel()
    if (!model) return

    model.onDidChangeContent(() => {
      // Ignore content changes triggered by external value updates (streaming, tab switch)
      if (ignoreNextChangeRef.current) {
        ignoreNextChangeRef.current = false
        return
      }

      if (debounceRef.current) clearTimeout(debounceRef.current)

      debounceRef.current = setTimeout(() => {
        const state = useCodeGenStore.getState()
        if (state.isGenerating) return
        if (state.generatedFiles.length === 0) return

        const content = editor.getValue()
        const idx = state.activeFileIndex
        if (state.generatedFiles[idx]?.content !== content) {
          updateFileContent(idx, content)
        }
      }, 300)
    })
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      {generatedFiles.length > 0 && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-800 overflow-x-auto">
          {generatedFiles.map((file, i) => (
            <FileTab key={file.name} name={file.name} index={i} />
          ))}
          <div className="ml-auto flex items-center gap-0.5 shrink-0">
            <button
              className="px-1.5 py-0.5 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
              disabled={historyIndex <= 0}
              title="Undo (previous version)"
              onClick={() => {
                const prev = undoGeneration()
                if (prev) setGeneratedFiles(prev)
              }}
            >
              ↩
            </button>
            <button
              className="px-1.5 py-0.5 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
              disabled={historyIndex >= generationHistory.length - 1}
              title="Redo (next version)"
              onClick={() => {
                const next = redoGeneration()
                if (next) setGeneratedFiles(next)
              }}
            >
              ↪
            </button>
            <span className="text-[10px] text-zinc-600 ml-1">
              {historyIndex >= 0 ? `v${historyIndex + 1}/${generationHistory.length}` : ""}
            </span>
          </div>
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
            readOnly: isGenerating,
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
        {!isGenerating && activeFile && (
          <div className="absolute bottom-3 left-3 text-[10px] text-zinc-600 bg-zinc-900/80 rounded px-2 py-1">
            Editable — changes sync to Preview
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
      className={cn(
        "px-3 py-1 text-xs rounded-t-md transition-colors",
        isActive
          ? "bg-zinc-800 text-zinc-100"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
      )}
      onClick={() => setActiveFileIndex(index)}
    >
      {name}
    </button>
  )
}
