import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
  useSandpack,
} from "@codesandbox/sandpack-react"
import { useCodeGenStore } from "../stores/codeGenStore"
import { cn } from "../lib/utils"
import { useState, useEffect, useRef, useCallback } from "react"
import { runSelfHealingFix, getLastConfig } from "../agent"
import { DiffView } from "./DiffView"
import type { CapturedError, GeneratedFile } from "../types"

function buildSandpackFiles(
  generatedFiles: { name: string; content: string }[],
  framework: string
): { files: Record<string, string>; template: string } {
  const files: Record<string, string> = {}

  files["/styles.css"] =
    "body { margin: 0; font-family: system-ui, sans-serif; } * { box-sizing: border-box; }"

  if (framework === "vue") {
    const mainVue = generatedFiles.find((f) => f.name.endsWith(".vue"))
    if (mainVue) {
      files["/src/App.vue"] = mainVue.content
    }
    for (const f of generatedFiles) {
      if (f === mainVue) continue
      files[`/src/${f.name}`] = f.content
    }
    return { files, template: "vite-vue-ts" }
  }

  const mainFile = generatedFiles.find(
    (f) => f.name.endsWith(".tsx") || f.name.endsWith(".jsx")
  ) ?? generatedFiles[0]

  if (mainFile) {
    files["/App.tsx"] = mainFile.content
  }
  for (const f of generatedFiles) {
    if (f === mainFile) continue
    files[`/${f.name}`] = f.content
  }
  return { files, template: "react-ts" }
}

function isNetworkError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes("network error") ||
    lower.includes("failed to fetch") ||
    lower.includes("timeout")
  )
}

const AI_FIX_GRACE_MS = 3_000   // errors within this window → AI-generated, fix immediately
const USER_FIX_DELAY_MS = 10_000 // user edits → wait 10s after last keystroke

function SandpackSelfHealing() {
  const { listen } = useSandpack()
  const store = useCodeGenStore()

  const errorsRef = useRef<CapturedError[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFixingRef = useRef(false)
  const prevFilesRef = useRef(store.generatedFiles)
  const lastAiUpdateRef = useRef(Date.now())
  const [isFixing, setIsFixing] = useState(false)
  const [fixStatus, setFixStatus] = useState("")
  const [isWaitingForUser, setIsWaitingForUser] = useState(false)
  const [lastFix, setLastFix] = useState<{ beforeFiles: GeneratedFile[]; afterFiles: GeneratedFile[] } | null>(null)

  // Reset state when a new user generation comes in (files reference changes
  // while we're not in a self-healing cycle)
  useEffect(() => {
    if (prevFilesRef.current !== store.generatedFiles) {
      prevFilesRef.current = store.generatedFiles
      lastAiUpdateRef.current = Date.now()
      if (!isFixingRef.current && store.generatedFiles.length > 0) {
        store.resetRetries()
        errorsRef.current = []
        setIsFixing(false)
        setFixStatus("")
        setIsWaitingForUser(false)
      }
    }
  }, [store.generatedFiles])

  // Listen for Sandpack messages
  useEffect(() => {
    const unlisten = listen((msg: any) => {
      // Collect compile errors
      if (msg.type === "action" && msg.action === "show-error") {
        const errMsg = msg.message ?? ""
        if (isNetworkError(errMsg)) return

        errorsRef.current.push({
          title: (msg.title as string) ?? "Compile Error",
          path: (msg.path as string) ?? "/App.tsx",
          message: errMsg,
          line: (msg.line as number) ?? 0,
          column: (msg.column as number) ?? 0,
          source: "compile",
        })
      }

      // Collect runtime console errors
      if (msg.type === "console" && Array.isArray(msg.log)) {
        for (const entry of msg.log) {
          if (entry.method !== "error") continue
          for (const data of entry.data ?? []) {
            const errMsg = typeof data === "string" ? data : String(data ?? "")
            if (isNetworkError(errMsg)) continue
            errorsRef.current.push({
              title: "Runtime Error",
              path: "/App.tsx",
              message: errMsg,
              line: 0,
              column: 0,
              source: "runtime",
            })
          }
        }
      }

      // When compilation is done, debounce and check for errors
      if (msg.type === "done") {
        if (debounceRef.current) clearTimeout(debounceRef.current)

        const errors = errorsRef.current
        if (errors.length === 0) {
          setIsWaitingForUser(false)
          return
        }

        const elapsed = Date.now() - lastAiUpdateRef.current
        const isAiGenerated = elapsed < AI_FIX_GRACE_MS

        if (isAiGenerated) {
          // AI-generated errors → fix immediately
          const currentState = useCodeGenStore.getState()
          if (!isFixingRef.current && currentState.retryCount < currentState.maxRetries) {
            triggerFix(errors)
          }
        } else {
          // User-edited errors → wait 10s after last edit
          setIsWaitingForUser(true)
          debounceRef.current = setTimeout(() => {
            const currentState = useCodeGenStore.getState()
            if (
              errorsRef.current.length > 0 &&
              !isFixingRef.current &&
              currentState.retryCount < currentState.maxRetries
            ) {
              setIsWaitingForUser(false)
              triggerFix(errorsRef.current)
            }
          }, USER_FIX_DELAY_MS)
        }
      }
    })

    return () => {
      unlisten()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const triggerFix = useCallback(async (errors: CapturedError[]) => {
    const config = getLastConfig()
    if (!config) return

    const currentState = useCodeGenStore.getState()
    if (currentState.retryCount >= currentState.maxRetries) return

    isFixingRef.current = true
    setIsFixing(true)

    const attemptNum = currentState.retryCount + 1
    setFixStatus(
      `Fixing ${errors.length} error${errors.length > 1 ? "s" : ""}... Attempt ${attemptNum}/${currentState.maxRetries}`
    )

    currentState.setCapturedErrors(errors)
    currentState.incrementRetry()

    const beforeFiles = [...currentState.generatedFiles]

    try {
      const result = await runSelfHealingFix(
        config,
        errors,
        currentState.generatedFiles,
        attemptNum,
        currentState.language,
        currentState.framework
      )

      currentState.addFixAttempt({
        errors,
        beforeFiles,
        afterFiles: result.files,
        timestamp: Date.now(),
      })

      currentState.pushToHistory(result.files)

      setLastFix({ beforeFiles: [...beforeFiles], afterFiles: result.files })

      currentState.setGeneratedFiles(result.files)
      currentState.setTokensUsed(currentState.tokensUsed + result.tokensUsed)

      // Clear errors for the next compilation cycle
      errorsRef.current = []
      setFixStatus("")
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === "AbortError"
      if (isAbort) {
        currentState.resetRetries()
        errorsRef.current = []
        setFixStatus("")
      } else {
        setFixStatus(
          `Fix attempt ${attemptNum} failed. ${currentState.retryCount >= currentState.maxRetries ? "Max retries reached." : "Retrying..."}`
        )
      }
    } finally {
      isFixingRef.current = false
      setIsFixing(false)

      // Check if max retries exhausted
      const latestState = useCodeGenStore.getState()
      if (latestState.retryCount >= latestState.maxRetries && errorsRef.current.length > 0) {
        setFixStatus(
          `Auto-fix failed after ${latestState.maxRetries} attempts. Last code preserved.`
        )
      }
    }
  }, [])

  if (!isFixing && !fixStatus && !isWaitingForUser) return null

  return (
    <>
      <div
        className={cn(
          "px-4 py-2 text-xs flex items-center gap-2 border-b border-zinc-800 shrink-0",
          isWaitingForUser
            ? "text-blue-400 bg-blue-950/30"
            : fixStatus.includes("failed") || fixStatus.includes("Max retries")
              ? "text-red-400 bg-red-950/30"
              : "text-amber-400 bg-amber-950/30"
        )}
      >
        <span className={cn(!isWaitingForUser && "animate-pulse")}>
          {isWaitingForUser ? "◎" : fixStatus.includes("failed") || fixStatus.includes("Max retries") ? "✕" : "⚠"}
        </span>
        <span>
          {isWaitingForUser
            ? `Detected ${errorsRef.current.length} error${errorsRef.current.length > 1 ? "s" : ""} in edited code. Auto-fix in a few seconds...`
            : fixStatus}
        </span>
      </div>
      {lastFix && (
        <div className="px-4 py-2 border-b border-zinc-800 shrink-0">
          <DiffView beforeFiles={lastFix.beforeFiles} afterFiles={lastFix.afterFiles} />
        </div>
      )}
    </>
  )
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
          <SandpackSelfHealing />
          <SandpackLayout
            style={{
              height: "100%",
              border: "none",
              borderRadius: 0,
            }}
          >
            <SandpackPreview
              showNavigator={false}
              showRefreshButton
              style={viewMode !== "preview" ? { display: "none" } : undefined}
            />
            <SandpackCodeEditor
              showLineNumbers
              style={viewMode !== "code" ? { display: "none" } : undefined}
            />
          </SandpackLayout>
        </SandpackProvider>
      </div>
    </div>
  )
}
