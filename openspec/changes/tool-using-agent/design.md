# 技术设计 — Tool-Using Agent

## 整体架构

```
User Prompt
     │
     ▼
┌─────────────────────────────────────┐
│           Agent Loop                │
│                                     │
│   ┌──────────┐    ┌──────────┐     │
│   │  Think   │◄───│ Observe  │     │
│   │ (LLM)    │    │ (Tools)  │     │
│   └────┬─────┘    └────▲─────┘     │
│        │                │           │
│        │ Action         │ Result    │
│        └────────────────┘           │
│                                     │
│   Tools: readFile, writeFile,       │
│          runCheck, getErrors, done  │
└─────────────────────────────────────┘
     │
     ▼
  Generate complete files → Sandpack Preview
```

## Decision 1: JSON Tool Calling 协议（非原生 function calling）

**决策**: 使用 JSON 格式的工具调用协议，在 System Prompt 中定义工具 schema，兼容所有 LLM Provider（包括没有原生 function calling 的）。

**格式**:
```json
<tool_call>
{"name": "writeFile", "arguments": {"path": "Button.tsx", "content": "..."}}
</tool_call>

<tool_call>
{"name": "readFile", "arguments": {"path": "Button.tsx"}}
</tool_call>

<tool_call>
{"name": "runCheck", "arguments": {}}
</tool_call>

<tool_call>
{"name": "done", "arguments": {}}
</tool_call>
```

**理由**:
- 零 Provider 依赖，不要求模型支持 native tool calling
- Anthropic 的 tool_use / OpenAI 的 tool_calls 都能用，但我们用 prompt 描述工具，响应解析统一
- 面试时可以讲 "为了兼容性我设计了一套协议层"

## Decision 2: 虚拟文件系统 (In-Memory FS)

**决策**: Agent 操作一个内存中的虚拟文件系统，不依赖真实 FS。

**实现**:
```ts
interface VirtualFS {
  files: Map<string, string>  // path → content
  readFile(path: string): string
  writeFile(path: string, content: string): void
  listFiles(): string[]
}
```

**理由**:
- 浏览器环境无法访问真实 FS
- 虚拟 FS 状态可以同步到 Zustand store 供 UI 展示
- 每个 generation session 一个独立 FS 实例

## Decision 3: Agent Loop 实现

**决策**: 在现有 `src/agent/` 下新增 `agent-loop.ts`，不修改 `generate.ts`（保留旧通道作为 quick mode）。

**实现流程**:
1. 初始化 VirtualFS（包含 Sandpack 模板基础文件）
2. System Prompt 注入 Agent 角色 + 工具定义
3. While loop（max 15 turns）:
   a. 调用 LLM streaming
   b. 解析响应中的 `<tool_call>` 标签
   c. 执行工具调用，收集结果
   d. 将 tool result 作为新 message 追加到对话
   e. 如果 LLM 发出 `done`，退出循环
4. 从 VirtualFS 提取所有文件 → 更新 generatedFiles store → Sandpack 渲染

## Decision 4: 前端 Agent Panel

**决策**: 在 Code/Preview 区域的顶部或 Chat 面板中展示 Agent 的思考过程。

**展示内容**:
- 每一步的 Thought（来自 LLM 输出中 tool_call 之前的文本）
- 每一步的 Action（工具名 + 参数摘要）
- 每一步的 Observation（工具返回值，截断显示）

用可折叠的步骤卡片展示。

## Decision 5: 保留旧 code mode 作为 Quick Mode

**决策**: 原 `code` mode 改名为 `quick` mode（单次生成），新增 `agent` mode（tool-using loop）。用户可在 InputPanel 中切换。
