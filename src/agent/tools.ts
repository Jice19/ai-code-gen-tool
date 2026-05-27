import type { ToolResult } from "../types"
import type { VirtualFS } from "./virtual-fs"

export type ToolHandler = (args: Record<string, string>) => Promise<ToolResult> | ToolResult

export interface ToolDefinition {
  name: string
  description: string
  parameters: string // JSON schema string for LLM prompt
  handler: ToolHandler
}

export function createToolRegistry(fs: VirtualFS, getErrorsFn: () => string[]): ToolDefinition[] {
  return [
    {
      name: "readFile",
      description: "Read the content of a file from the project.",
      parameters: `{"path": "string — relative file path, e.g. 'src/App.tsx'"}`,
      handler: (args) => {
        const path = args.path
        if (!path) return { success: false, message: "Missing required parameter: path" }
        const content = fs.readFile(path)
        if (content === undefined) {
          return { success: false, message: `File not found: ${path}. Available files: ${fs.listFiles().join(", ") || "(none)"}` }
        }
        return { success: true, message: `Read ${path} (${content.length} chars)`, data: content }
      },
    },
    {
      name: "writeFile",
      description: "Write or overwrite a file. This creates the file if it doesn't exist.",
      parameters: `{"path": "string — relative file path", "content": "string — complete file source code"}`,
      handler: (args) => {
        const { path, content } = args
        if (!path) return { success: false, message: "Missing required parameter: path" }
        if (content === undefined) return { success: false, message: "Missing required parameter: content" }
        fs.writeFile(path, content)
        return { success: true, message: `Wrote ${path} (${content.length} chars)` }
      },
    },
    {
      name: "listFiles",
      description: "List all files currently in the project.",
      parameters: "{}",
      handler: () => {
        const files = fs.listFiles()
        if (files.length === 0) {
          return { success: true, message: "No files in project yet." }
        }
        return { success: true, message: `Project files:\n${files.map((f) => `  - ${f}`).join("\n")}` }
      },
    },
    {
      name: "runCheck",
      description: "Run a quick validation to check for obvious syntax issues in the current code. Always run this after writing files.",
      parameters: `{"path": "string — optional, check a specific file. Omit to check all files."}`,
      handler: (args) => {
        const errors: string[] = []
        const files = args.path ? [[args.path, fs.readFile(args.path)] as const] : [...fs.listFiles().map((p) => [p, fs.readFile(p)] as const)]

        for (const [path, content] of files) {
          if (!content) continue
          const ext = path.split(".").pop() ?? ""

          if (ext === "tsx" || ext === "ts" || ext === "jsx" || ext === "js") {
            // Check for common issues
            if (content.includes("import ") && !content.match(/^import\s/m) && !content.startsWith("import") && !content.startsWith("//") && !content.startsWith("{") && !content.startsWith("/*")) {
              // This is fine — imports can be at the top
            }
            // Unbalanced brackets
            const openBrackets = (content.match(/[{[(]/g) || []).length
            const closeBrackets = (content.match(/[}\])]/g) || []).length
            if (openBrackets !== closeBrackets) {
              errors.push(`${path}: Unbalanced brackets (${openBrackets} open, ${closeBrackets} close)`)
            }
            // Missing export default
            if ((ext === "tsx" || ext === "jsx") && !content.includes("export default") && !content.includes("export {")) {
              errors.push(`${path}: No default export found — component must be exported`)
            }
          }

          if (ext === "vue") {
            if (!content.includes("<template>") && !content.includes("<template ")) {
              errors.push(`${path}: Vue SFC missing <template> block`)
            }
            if (!content.includes("<script")) {
              errors.push(`${path}: Vue SFC missing <script> block`)
            }
          }
        }
        return { success: errors.length === 0, message: errors.length > 0 ? errors.join("\n") : "All checks passed" }
      },
    },
    {
      name: "getErrors",
      description: "Get the current compile/runtime error list from the Sandpack sandbox. Call this after writing files and waiting for compilation.",
      parameters: "{}",
      handler: () => {
        const errors = getErrorsFn()
        if (errors.length === 0) {
          return { success: true, message: "No errors detected." }
        }
        return { success: false, message: `${errors.length} error(s):\n${errors.join("\n")}` }
      },
    },
    {
      name: "done",
      description: "Mark the task as complete. Call this when all files are written and checks pass.",
      parameters: `{"summary": "string — one-line summary of what was built"}`,
      handler: (args) => {
        return { success: true, message: `Task complete: ${args.summary || "Component generated"}` }
      },
    },
  ]
}

// Format tools for inclusion in system prompt
export function formatToolsForPrompt(tools: ToolDefinition[]): string {
  return tools
    .map(
      (t) =>
        `### ${t.name}\n${t.description}\nParameters: ${t.parameters}`
    )
    .join("\n\n")
}
