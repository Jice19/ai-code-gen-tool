import { create } from "zustand"
import type { ChatMessage, Framework, Language, Mode, GeneratedFile, CapturedError, FixAttempt } from "../types"

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
  streamingFiles: GeneratedFile[]
  tokensUsed: number
  setIsGenerating: (v: boolean) => void
  setGeneratedFiles: (files: GeneratedFile[]) => void
  setActiveFileIndex: (index: number) => void
  updateFileContent: (index: number, content: string) => void
  appendStreamingContent: (chunk: string) => void
  setStreamingFiles: (files: GeneratedFile[]) => void
  setTokensUsed: (tokens: number) => void
  clearGeneration: () => void
  cancelGeneration: () => void
  _abortController: AbortController | null
  _setAbortController: (ctrl: AbortController | null) => void

  // Self-healing
  retryCount: number
  maxRetries: number
  capturedErrors: CapturedError[]
  fixHistory: FixAttempt[]
  lastAiGenerationTime: number
  incrementRetry: () => void
  resetRetries: () => void
  setCapturedErrors: (errors: CapturedError[]) => void
  addFixAttempt: (attempt: FixAttempt) => void
  markAiGenerationComplete: () => void

  // History
  generationHistory: GeneratedFile[][]
  historyIndex: number
  pushToHistory: (files: GeneratedFile[]) => void
  undoGeneration: () => GeneratedFile[] | null
  redoGeneration: () => GeneratedFile[] | null

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
  streamingFiles: [],
  tokensUsed: 0,
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setGeneratedFiles: (generatedFiles) => set({ generatedFiles, activeFileIndex: 0 }),
  setActiveFileIndex: (activeFileIndex) => set({ activeFileIndex }),
  updateFileContent: (index, content) =>
    set((s) => ({
      generatedFiles: s.generatedFiles.map((f, i) =>
        i === index ? { ...f, content } : f
      ),
    })),
  appendStreamingContent: (chunk) =>
    set((s) => ({ streamingContent: s.streamingContent + chunk })),
  setStreamingFiles: (streamingFiles) => set({ streamingFiles }),
  setTokensUsed: (tokensUsed) => set({ tokensUsed }),
  clearGeneration: () =>
    set({ generatedFiles: [], streamingContent: "", streamingFiles: [], tokensUsed: 0, activeFileIndex: 0 }),
  cancelGeneration: () => {
    const { _abortController } = get()
    if (_abortController) {
      _abortController.abort()
      set({ _abortController: null })
    }
  },
  _abortController: null,
  _setAbortController: (_abortController) => set({ _abortController }),

  // Self-healing defaults
  retryCount: 0,
  maxRetries: 3,
  capturedErrors: [],
  fixHistory: [],
  lastAiGenerationTime: 0,
  incrementRetry: () => set((s) => ({ retryCount: s.retryCount + 1 })),
  resetRetries: () => set({ retryCount: 0, capturedErrors: [], fixHistory: [] }),
  setCapturedErrors: (capturedErrors) => set({ capturedErrors }),
  addFixAttempt: (attempt) =>
    set((s) => ({ fixHistory: [...s.fixHistory, attempt] })),
  markAiGenerationComplete: () => set({ lastAiGenerationTime: Date.now() }),

  // History defaults
  generationHistory: [],
  historyIndex: -1,
  pushToHistory: (files) =>
    set((s) => ({
      generationHistory: [...s.generationHistory.slice(0, s.historyIndex + 1), files],
      historyIndex: s.historyIndex + 1,
    })),
  undoGeneration: () => {
    const { generationHistory, historyIndex } = get()
    if (historyIndex <= 0) return null
    const newIndex = historyIndex - 1
    set({ historyIndex: newIndex })
    return generationHistory[newIndex]
  },
  redoGeneration: () => {
    const { generationHistory, historyIndex } = get()
    if (historyIndex >= generationHistory.length - 1) return null
    const newIndex = historyIndex + 1
    set({ historyIndex: newIndex })
    return generationHistory[newIndex]
  },

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
