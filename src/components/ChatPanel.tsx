import { useState, useRef, useEffect } from "react"
import { useCodeGenStore } from "../stores/codeGenStore"

export function ChatPanel({ onSend }: { onSend: (message: string) => void }) {
  const { chatMessages, isGenerating, cancelGeneration } = useCodeGenStore()
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const handleSubmit = () => {
    if (!input.trim() || isGenerating) return
    onSend(input.trim())
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider px-1 py-3 border-b border-zinc-800">
        Conversation
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-3">
        {chatMessages.length === 0 && (
          <p className="text-xs text-zinc-500 px-1">
            After generating code, describe changes you&apos;d like to make.
          </p>
        )}
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-zinc-700 text-zinc-100"
                  : "bg-zinc-800/50 text-zinc-300 border border-zinc-700/50"
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider mb-1 text-zinc-500">
                {msg.role === "user" ? "You" : "Assistant"}
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                <span className="inline-block w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="inline-block w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-zinc-800 pt-3">
        <textarea
          className="w-full h-16 bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-500 transition-colors"
          placeholder="e.g. Add a loading state and error handling..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isGenerating}
        />
        <button
          className="w-full mt-2 py-2 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          disabled={isGenerating || input.trim().length === 0}
          onClick={handleSubmit}
        >
          {isGenerating ? "Updating..." : "Send Modification"}
        </button>
        {isGenerating && (
          <button
            className="w-full mt-1.5 py-2 rounded-lg text-xs font-medium bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800 transition-all"
            onClick={cancelGeneration}
          >
            Cancel Generation
          </button>
        )}
      </div>
    </div>
  )
}
