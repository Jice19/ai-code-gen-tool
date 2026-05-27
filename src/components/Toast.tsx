import { useToastStore } from "../stores/toastStore"
import type { ToastType } from "../stores/toastStore"
import { cn } from "../lib/utils"

const typeStyles: Record<ToastType, string> = {
  success: "border-emerald-700 bg-emerald-950/80 text-emerald-300",
  error: "border-red-700 bg-red-950/80 text-red-300",
  info: "border-blue-700 bg-blue-950/80 text-blue-300",
}

const typeIcons: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "px-4 py-3 rounded-lg border text-xs shadow-lg pointer-events-auto flex items-center gap-2 animate-[slideIn_0.2s_ease-out]",
            typeStyles[t.type]
          )}
          style={{
            animation: "slideIn 0.2s ease-out",
          }}
        >
          <span className="font-bold text-sm">{typeIcons[t.type]}</span>
          <span className="flex-1">{t.message}</span>
          <button
            className="ml-2 opacity-50 hover:opacity-100 transition-opacity"
            onClick={() => removeToast(t.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
