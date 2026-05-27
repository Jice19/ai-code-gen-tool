import { useEffect } from "react"

interface ShortcutHandlers {
  onGenerate: () => void
  onCancel: () => void
  onFocusInput: () => void
  isGenerating: boolean
}

export function useKeyboardShortcuts({
  onGenerate,
  onCancel,
  onFocusInput,
  isGenerating,
}: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      // Cmd/Ctrl + Enter → Generate
      if (mod && e.key === "Enter") {
        e.preventDefault()
        if (!isGenerating) {
          onGenerate()
        }
        return
      }

      // Cmd/Ctrl + Shift + C → Cancel
      if (mod && e.shiftKey && e.key === "c") {
        e.preventDefault()
        if (isGenerating) {
          onCancel()
        }
        return
      }

      // Cmd/Ctrl + K → Focus prompt input
      if (mod && e.key === "k") {
        e.preventDefault()
        onFocusInput()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onGenerate, onCancel, onFocusInput, isGenerating])
}
