# Technical Design: AI Code Generator

## Architecture

```
┌──────────────────────────┐
│   Frontend (React 19)     │  Vite + Tailwind + Zustand
│   - Input Panel           │
│   - Code Editor (Monaco)  │
│   - Preview (Sandpack)    │
│   - Chat Panel            │
├──────────────────────────┤
│   Agent Layer             │  AI 编排
│   - LLM Provider Adapter  │
│   - Prompt Templates      │
│   - Context Manager       │
├──────────────────────────┤
│   Backend (Hono/Node)     │  API 代理
│   - POST /api/generate    │  (SSE streaming)
│   - POST /api/export      │  (ZIP download)
├──────────────────────────┤
│   LLM APIs                │
│   - OpenAI / Claude / 智谱 │
└──────────────────────────┘
```

## Tech Stack

### Frontend
- **Runtime**: React 19 + TypeScript 5
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **State Management**: Zustand
- **Code Editor**: Monaco Editor (@monaco-editor/react)
- **Preview**: Sandpack (@codesandbox/sandpack-react)
- **Markdown**: react-markdown

### Backend
- **Runtime**: Node.js 24
- **Framework**: Hono (deployed on Node)
- **Streaming**: Server-Sent Events (SSE)
- **Packaging**: archiver (ZIP)

### Agent
- **LLM Integration**: OpenAI SDK (compatible with multiple providers)
- **Providers**: OpenAI, Anthropic, Zhipu (GLM)
- **Streaming**: ReadableStream / AsyncIterator

## Directory Structure

```
ai-code-gen-tool/
├── packages/
│   ├── frontend/          # React 前端应用
│   │   ├── src/
│   │   │   ├── components/  # UI 组件
│   │   │   ├── stores/      # Zustand stores
│   │   │   ├── hooks/       # Custom hooks
│   │   │   ├── lib/         # Utilities
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── backend/           # Hono API 服务
│   │   ├── src/
│   │   │   ├── routes/      # API 路由
│   │   │   ├── services/    # 业务逻辑
│   │   │   └── index.ts
│   │   └── package.json
│   └── agent/             # AI Agent 核心
│       ├── src/
│       │   ├── providers/   # LLM Provider 适配器
│       │   ├── prompts/     # Prompt 模板
│       │   ├── context.ts   # 上下文管理
│       │   └── index.ts
│       └── package.json
├── openspec/              # OpenSpec 规范
├── package.json           # Workspace root
└── pnpm-workspace.yaml
```

## API Design

### POST /api/generate
Request (SSE):
```json
{
  "requirement": "string",
  "framework": "react",
  "language": "typescript",
  "history": [{ "role": "user|assistant", "content": "string" }],
  "provider": "openai|anthropic|zhipu"
}
```
Response: `text/event-stream` with chunks

### POST /api/export
Request:
```json
{
  "files": [{ "path": "string", "content": "string" }],
  "format": "zip|single"
}
```
Response: `application/zip` blob or `text/plain`

## State Management (Zustand)

```typescript
interface AppState {
  // Input
  requirement: string;
  framework: 'react' | 'vue' | 'next' | 'nuxt';
  language: 'typescript' | 'javascript';

  // Generation
  isGenerating: boolean;
  generatedFiles: FileNode[];
  streamContent: string;
  tokenUsage: TokenUsage | null;

  // Chat
  chatHistory: ChatMessage[];

  // Preview
  activeView: 'code' | 'preview';
  activeFile: string | null;

  // Actions
  setRequirement: (text: string) => void;
  generate: () => Promise<void>;
  sendMessage: (msg: string) => Promise<void>;
  exportProject: (format: 'zip' | 'copy') => void;
}
```

## LLM Provider Abstraction

```typescript
interface LLMProvider {
  name: string;
  models: string[];
  generateStream(req: GenerateRequest): AsyncIterable<string>;
}

// Adapters for: OpenAI, Anthropic, Zhipu
```
