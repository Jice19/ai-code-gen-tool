import { useState } from "react"
import { computeDiff, type DiffLine } from "../lib/utils"
import { cn } from "../lib/utils"
import type { GeneratedFile } from "../types"

function FileDiff({ before, after, filename }: { before: string; after: string; filename: string }) {
  const diff = computeDiff(before, after)
  const totalChanges = diff.filter((d) => d.type !== "same").length

  if (totalChanges === 0) {
    return (
      <div className="text-xs text-zinc-500 px-2 py-1">
        {filename}: no changes
      </div>
    )
  }

  return (
    <div className="mb-2">
      <div className="text-[10px] text-zinc-400 px-2 py-0.5 font-medium uppercase tracking-wider">
        {filename} ({totalChanges} changed)
      </div>
      <div className="font-mono text-[11px] leading-5 max-h-60 overflow-auto bg-zinc-900/50 rounded">
        {diff.map((line, i) => (
          <DiffLineRow key={i} line={line} />
        ))}
      </div>
    </div>
  )
}

function DiffLineRow({ line }: { line: DiffLine }) {
  return (
    <div
      className={cn(
        "px-2 whitespace-pre border-l-2",
        line.type === "added" && "bg-emerald-950/30 border-emerald-600 text-emerald-300",
        line.type === "removed" && "bg-red-950/30 border-red-600 text-red-300",
        line.type === "same" && "border-transparent text-zinc-500"
      )}
    >
      <span className="text-zinc-600 mr-2 select-none w-6 inline-block text-right">
        {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
      </span>
      {line.content}
    </div>
  )
}

export function DiffView({
  beforeFiles,
  afterFiles,
}: {
  beforeFiles: GeneratedFile[]
  afterFiles: GeneratedFile[]
}) {
  const [collapsed, setCollapsed] = useState(false)

  const fileMap = new Map<string, GeneratedFile>()
  for (const f of beforeFiles) fileMap.set(f.name, f)

  return (
    <div className="border-t border-zinc-800 mt-2 pt-2">
      <button
        className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className={cn("text-[10px] transition-transform", !collapsed && "rotate-90")}>
          ▶
        </span>
        {collapsed ? "Show Changes" : "Hide Changes"}
      </button>
      {!collapsed && (
        <div className="mt-2">
          {afterFiles.map((after) => {
            const before = fileMap.get(after.name)
            return (
              <FileDiff
                key={after.name}
                filename={after.name}
                before={before?.content ?? ""}
                after={after.content}
              />
            )
          })}
          {beforeFiles
            .filter((b) => !afterFiles.find((a) => a.name === b.name))
            .map((removed) => (
              <FileDiff
                key={removed.name}
                filename={removed.name + " (deleted)"}
                before={removed.content}
                after=""
              />
            ))}
        </div>
      )}
    </div>
  )
}
