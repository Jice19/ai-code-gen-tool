

import { useEffect, useRef } from "react"
import { useCodeGenStore } from "../stores/codeGenStore"
import { cn } from "../lib/utils"
import type { AgentStep } from "../types"

function StepCard({ step, isLast }: { step: AgentStep; isLast: boolean }) {
  const toolName = step.toolCall?.name ?? ""
  const toolIcon =
    toolName === "writeFile" ? "📝" :
    toolName === "readFile" ? "📖" :
    toolName === "listFiles" ? "📂" :
    toolName === "runCheck" ? "🔍" :
    toolName === "getErrors" ? "🐛" :
    toolName === "done" ? "✅" : "🔧"

  const success = step.result?.success
  const resultLabel = step.result
    ? success
      ? "✓ Success"
      : "✗ Failed"
    : "..."

  return (
    <div className={cn(
      "border rounded-lg p-3 transition-all",
      isLast && !step.result
        ? "border-amber-700 bg-amber-950/20"
        : step.result?.success === false
          ? "border-red-800 bg-red-950/10"
          : "border-zinc-800 bg-zinc-900/30"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">{toolIcon}</span>
        <span className="text-xs font-medium text-zinc-300">
          {toolName || "Thinking"}
        </span>
        <span className={cn(
          "text-[10px] ml-auto px-1.5 py-0.5 rounded-full",
          success === true ? "bg-emerald-900/40 text-emerald-400" :
          success === false ? "bg-red-900/40 text-red-400" :
          "bg-zinc-800 text-zinc-500"
        )}>
          {resultLabel}
        </span>
      </div>

      {step.thought && (
        <details className="mb-1" open>
          <summary className="text-[10px] text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-400">
            Thought
          </summary>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed whitespace-pre-wrap">
            {step.thought}
          </p>
        </details>
      )}

      {step.toolCall && (
        <details className="mb-1">
          <summary className="text-[10px] text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-400">
            Action
          </summary>
          <pre className="text-[10px] text-zinc-500 mt-1 bg-zinc-950 rounded p-2 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(step.toolCall, null, 2)}
          </pre>
        </details>
      )}

      {step.result && (
        <details>
          <summary className="text-[10px] text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-400">
            Observation
          </summary>
          <pre className={cn(
            "text-[10px] mt-1 bg-zinc-950 rounded p-2 overflow-x-auto whitespace-pre-wrap",
            step.result.success ? "text-zinc-500" : "text-red-400"
          )}>
            {step.result.message}
          </pre>
        </details>
      )}
    </div>
  )
}

export function AgentPanel() {
  const agentSteps = useCodeGenStore((s) => s.agentSteps)
  const isGenerating = useCodeGenStore((s) => s.isGenerating)
  const mode = useCodeGenStore((s) => s.mode)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (agentSteps.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [agentSteps.length])

  if (mode !== "agent") return null

  return (
    <div className="flex flex-col gap-3 p-4 overflow-auto">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Agent Steps
        </h3>
        {isGenerating && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Working...
          </span>
        )}
      </div>

      {agentSteps.length === 0 ? (
        <p className="text-xs text-zinc-600 italic">
          {isGenerating
            ? "Agent is analyzing your request..."
            : "Start the agent to see steps here."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {agentSteps.map((step, i) => (
            <StepCard
              key={step.id}
              step={step}
              isLast={i === agentSteps.length - 1}
            />
          ))}
        </div>
      )}

      {!isGenerating && agentSteps.length > 0 && agentSteps[agentSteps.length - 1]?.toolCall?.name === "done" && (
        <p className="text-xs text-emerald-500 font-medium">
          Agent completed successfully.
        </p>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
