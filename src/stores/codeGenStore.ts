import { create } from "zustand"
import type { ChatMessage, Framework, Language, Mode, GeneratedFile } from "../types"

interface CodeGenState {
  // Input
  prompt: string
  framework: Framework
  language: Language
  mode: Mode
  setPrompt: (prompt: string) => void
  setFramework: (framework: Framework) => void
  setLanguage: (language: Language) => void
  setMode: (mode: Mode) => void

  // Generation
  isGenerating: boolean
  generatedFiles: GeneratedFile[]
  activeFileIndex: number
  streamingContent: string
  tokensUsed: number
  setIsGenerating: (v: boolean) => void
  setGeneratedFiles: (files: GeneratedFile[]) => void
  setActiveFileIndex: (index: number) => void
  appendStreamingContent: (chunk: string) => void
  setTokensUsed: (tokens: number) => void
  clearGeneration: () => void
  cancelGeneration: () => void
  _abortController: AbortController | null
  _setAbortController: (ctrl: AbortController | null) => void

  // Chat
  chatMessages: ChatMessage[]
  addChatMessage: (msg: ChatMessage) => void
  appendChatContent: (id: string, chunk: string) => void
  clearChat: () => void
}

export const useCodeGenStore = create<CodeGenState>((set, get) => ({
  // Input defaults
  prompt: "",
  framework: "react",
  language: "typescript",
  mode: "code",
  setPrompt: (prompt) => set({ prompt }),
  setFramework: (framework) => set({ framework }),
  setLanguage: (language) => set({ language }),
  setMode: (mode) => set({ mode }),

  // Generation defaults
  isGenerating: false,
  generatedFiles: [],
  activeFileIndex: 0,
  streamingContent: "",
  tokensUsed: 0,
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setGeneratedFiles: (generatedFiles) => set({ generatedFiles, activeFileIndex: 0 }),
  setActiveFileIndex: (activeFileIndex) => set({ activeFileIndex }),
  appendStreamingContent: (chunk) =>
    set((s) => ({ streamingContent: s.streamingContent + chunk })),
  setTokensUsed: (tokensUsed) => set({ tokensUsed }),
  clearGeneration: () =>
    set({ generatedFiles: [], streamingContent: "", tokensUsed: 0, activeFileIndex: 0 }),
  cancelGeneration: () => {
    const { _abortController } = get()
    if (_abortController) {
      _abortController.abort()
      set({ _abortController: null })
    }
  },
  _abortController: null,
  _setAbortController: (_abortController) => set({ _abortController }),

  // Chat defaults
  chatMessages: [],
  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  appendChatContent: (id, chunk) =>
    set((s) => ({
      chatMessages: s.chatMessages.map((m) =>
        m.id === id ? { ...m, content: m.content + chunk } : m
      ),
    })),
  clearChat: () => set({ chatMessages: [] }),
}))
