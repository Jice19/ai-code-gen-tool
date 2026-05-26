import { useState, useRef, useEffect, useCallback } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import ReactMarkdown from "react-markdown"
import { useCodeGenStore } from "../stores/codeGenStore"
import { cn } from "../lib/utils"

function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        code: ({ className, children, ...props }) => {
          const isInline = !className
          if (isInline) {
            return (
              <code className="bg-zinc-700/50 text-zinc-200 px-1 py-0.5 rounded text-[11px]" {...props}>
                {children}
              </code>
            )
          }
          return (
            <pre className="bg-zinc-900 rounded-md p-2.5 my-2 overflow-x-auto">
              <code className="text-[11px] text-zinc-200" {...props}>
                {children}
              </code>
            </pre>
          )
        },
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="text-xs">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-zinc-200">{children}</strong>,
        em: ({ children }) => <em className="italic text-zinc-200">{children}</em>,
        a: ({ children, href }) => (
          <a href={href} className="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        h1: ({ children }) => <h1 className="text-sm font-semibold text-zinc-200 mt-3 mb-1">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xs font-semibold text-zinc-200 mt-2 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-xs font-semibold text-zinc-200 mt-2 mb-1">{children}</h3>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-zinc-600 pl-3 my-2 text-zinc-400 italic">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function ChatMessageRow({ msg, isLast }: { msg: { role: string; content: string }; isLast: boolean }) {
  const isAssistant = msg.role === "assistant"
  return (
    <div className={cn("flex", isAssistant ? "justify-start" : "justify-end", isLast ? "pb-2" : "")}>
      <div
        className={cn(
          "max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed",
          isAssistant
            ? "bg-zinc-800/50 text-zinc-300 border border-zinc-700/50"
            : "bg-zinc-700 text-zinc-100"
        )}
      >
        <div className="text-[10px] uppercase tracking-wider mb-1 text-zinc-500">
          {isAssistant ? "Assistant" : "You"}
        </div>
        {isAssistant ? (
          <MarkdownRenderer content={msg.content} />
        ) : (
          <div className="whitespace-pre-wrap">{msg.content}</div>
        )}
      </div>
    </div>
  )
}

export function ChatPanel({ onSend }: { onSend: (message: string) => void }) {
  const { chatMessages, isGenerating, cancelGeneration } = useCodeGenStore()
  const [input, setInput] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: chatMessages.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 120,
    overscan: 3,
  })

  const items = virtualizer.getVirtualItems()

  // Auto-scroll to bottom on new messages or content change
  const prevLenRef = useRef(chatMessages.length)
  useEffect(() => {
    const len = chatMessages.length
    if (len > 0 && len > prevLenRef.current) {
      virtualizer.scrollToIndex(len - 1, { align: "end" })
    }
    // Also scroll when last message content changes (streaming)
    if (len > 0 && len === prevLenRef.current) {
      virtualizer.scrollToIndex(len - 1, { align: "end" })
    }
    prevLenRef.current = len
  }, [chatMessages.length, chatMessages.at(-1)?.content, virtualizer])

  const handleSubmit = useCallback(() => {
    if (!input.trim() || isGenerating) return
    onSend(input.trim())
    setInput("")
  }, [input, isGenerating, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const showEmpty = chatMessages.length === 0

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider px-1 py-3 border-b border-zinc-800 shrink-0">
        Conversation
      </div>

      {/* Virtual list container — takes remaining space */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto"
      >
        {showEmpty ? (
          <p className="text-xs text-zinc-500 px-1 py-3">
            Ask questions or describe the component you want to generate.
          </p>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {items.map((vi) => (
              <div
                key={vi.key}
                data-index={vi.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vi.start}px)`,
                }}
              >
                <ChatMessageRow
                  msg={chatMessages[vi.index]}
                  isLast={vi.index === chatMessages.length - 1}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generating indicator — outside virtual list */}
      {isGenerating && chatMessages.length > 0 && (
        <div className="flex justify-start px-1 shrink-0">
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-1.5 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
              <span className="inline-block w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.1s]" />
              <span className="inline-block w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
          </div>
        </div>
      )}

      {/* Input area — fixed at bottom */}
      <div className="border-t border-zinc-800 pt-3 shrink-0">
        <textarea
          className="w-full h-16 bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-500 transition-colors"
          placeholder="Type your message..."
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
          {isGenerating ? "Sending..." : "Send"}
        </button>
        {isGenerating && (
          <button
            className="w-full mt-1.5 py-2 rounded-lg text-xs font-medium bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800 transition-all"
            onClick={cancelGeneration}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
