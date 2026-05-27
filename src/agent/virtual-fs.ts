import type { GeneratedFile } from "../types"

export class VirtualFS {
  private files = new Map<string, string>()

  constructor(initialFiles?: GeneratedFile[]) {
    if (initialFiles) {
      for (const f of initialFiles) {
        this.writeFile(f.name, f.content)
      }
    }
  }

  readFile(path: string): string | undefined {
    return this.files.get(path)
  }

  writeFile(path: string, content: string): void {
    this.files.set(path, content)
  }

  deleteFile(path: string): void {
    this.files.delete(path)
  }

  listFiles(): string[] {
    return Array.from(this.files.keys())
  }

  toGeneratedFiles(): GeneratedFile[] {
    const result: GeneratedFile[] = []
    for (const [name, content] of this.files) {
      const ext = name.split(".").pop() ?? ""
      const langMap: Record<string, string> = {
        tsx: "typescript", ts: "typescript",
        jsx: "javascript", js: "javascript",
        vue: "html", css: "css",
      }
      result.push({
        name,
        content,
        language: langMap[ext] ?? "text",
      })
    }
    return result
  }

  isEmpty(): boolean {
    return this.files.size === 0
  }
}
