import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface DiffLine {
  type: "same" | "added" | "removed"
  content: string
  lineNum: { old: number; new: number }
}

export function computeDiff(before: string, after: string): DiffLine[] {
  const beforeLines = before.split("\n")
  const afterLines = after.split("\n")

  // Simple LCS-based diff
  const m = beforeLines.length
  const n = afterLines.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (beforeLines[i - 1] === afterLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack
  let i = m, j = n
  const lines: DiffLine[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && beforeLines[i - 1] === afterLines[j - 1]) {
      lines.push({ type: "same", content: beforeLines[i - 1], lineNum: { old: i, new: j } })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      lines.push({ type: "added", content: afterLines[j - 1], lineNum: { old: 0, new: j } })
      j--
    } else {
      lines.push({ type: "removed", content: beforeLines[i - 1], lineNum: { old: i, new: 0 } })
      i--
    }
  }

  return lines.reverse()
}

