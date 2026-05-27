import { useState } from "react"
import { useCodeGenStore } from "../stores/codeGenStore"
import type { Language, Framework, Mode } from "../types"
import { cn } from "../lib/utils"

export function InputPanel({ onGenerate }: { onGenerate: () => void }) {
  const {
    prompt, language, framework, mode,
    setPrompt, setLanguage, setFramework, setMode,
    isGenerating, cancelGeneration,
  } = useCodeGenStore()

  const [charCount, setCharCount] = useState(prompt.length)

  const handlePromptChange = (value: string) => {
    setPrompt(value)
    setCharCount(value.length)
  }

  const isChatMode = mode === "chat"
  const isAgentMode = mode === "agent"

  return (
    <div className="flex flex-col gap-4">
      {/* Mode Toggle */}
      <div className="flex bg-zinc-900 rounded-lg p-0.5">
        {(["chat", "quick", "agent"] as Mode[]).map((m) => (
          <button
            key={m}
            className={cn(
              "flex-1 py-1.5 text-xs font-medium rounded-md transition-all capitalize",
              mode === m
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            )}
            onClick={() => setMode(m)}
            disabled={isGenerating}
          >
            {m === "quick" ? "code" : m}
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          {isChatMode ? "Ask anything" : isAgentMode ? "Describe what to build (Agent mode)" : "Describe your component"}
        </label>
        <textarea
          id="prompt-input"
          className="mt-2 w-full h-36 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-500 transition-colors"
          placeholder={
            isChatMode
              ? "e.g. How do I handle race conditions with async state in React?"
              : isAgentMode
                ? "e.g. Build a kanban board with drag-and-drop, search, and filter by status"
                : "e.g. A signup form with email, password, and a submit button. Show validation errors inline."
          }
          value={prompt}
          onChange={(e) => handlePromptChange(e.target.value)}
          disabled={isGenerating}
        />
        <div className="text-right text-xs text-zinc-500 mt-1">{charCount} chars</div>
      </div>

      {!isChatMode && !isAgentMode && (
        <>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Framework
              </label>
              <select
                className="mt-2 w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
                value={framework}
                onChange={(e) => setFramework(e.target.value as Framework)}
                disabled={isGenerating}
              >
                <option value="react">React</option>
                <option value="vue">Vue 3</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Language
              </label>
              <select
                className="mt-2 w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                disabled={isGenerating}
              >
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
              </select>
            </div>
          </div>
        </>
      )}

      <button
        className="w-full py-2.5 rounded-lg font-medium text-sm bg-zinc-100 text-zinc-900 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        disabled={isGenerating || prompt.trim().length === 0}
        onClick={onGenerate}
      >
        {isGenerating
          ? isChatMode
            ? "Thinking..."
            : isAgentMode
              ? "Agent is working..."
              : "Generating..."
          : isChatMode
            ? "Send Message"
            : isAgentMode
              ? "Start Agent"
              : "Generate Code"}
      </button>

      {isGenerating && (
        <button
          className="w-full py-2 rounded-lg font-medium text-xs bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800 transition-all"
          onClick={cancelGeneration}
        >
          Cancel
        </button>
      )}
    </div>
  )
}
