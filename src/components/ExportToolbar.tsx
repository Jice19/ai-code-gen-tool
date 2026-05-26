import { useState, useCallback } from "react"
import JSZip from "jszip"
import { saveAs } from "file-saver"
import { useCodeGenStore } from "../stores/codeGenStore"

export function ExportToolbar() {
  const { generatedFiles, activeFileIndex } = useCodeGenStore()
  const [copied, setCopied] = useState(false)

  const activeFile = generatedFiles[activeFileIndex] ?? generatedFiles[0]
  const hasFiles = generatedFiles.length > 0

  const handleCopy = useCallback(async () => {
    if (!activeFile) return
    try {
      await navigator.clipboard.writeText(activeFile.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea")
      ta.value = activeFile.content
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [activeFile])

  const handleDownloadFile = useCallback(() => {
    if (!activeFile) return
    const blob = new Blob([activeFile.content], { type: "text/plain;charset=utf-8" })
    saveAs(blob, activeFile.name)
  }, [activeFile])

  const handleDownloadZip = useCallback(async () => {
    if (generatedFiles.length === 0) return
    const zip = new JSZip()
    for (const file of generatedFiles) {
      zip.file(file.name, file.content)
    }
    const blob = await zip.generateAsync({ type: "blob" })
    saveAs(blob, "generated-components.zip")
  }, [generatedFiles])

  if (!hasFiles) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800">
      <div className="text-xs text-zinc-500 mr-auto">
        {generatedFiles.length} file{generatedFiles.length > 1 ? "s" : ""}
      </div>
      <button
        className="px-3 py-1.5 text-xs rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
        onClick={handleCopy}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <button
        className="px-3 py-1.5 text-xs rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
        onClick={handleDownloadFile}
      >
        Download
      </button>
      {generatedFiles.length > 1 && (
        <button
          className="px-3 py-1.5 text-xs rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          onClick={handleDownloadZip}
        >
          ZIP All
        </button>
      )}
    </div>
  )
}
