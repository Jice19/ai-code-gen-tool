# Delta Spec — Tool-Using Agent

## ADDED Requirements

### Requirement: Tool-Using Agent Mode
用户应能在输入面板中选择 "Agent" 模式（现有 chat / code 之外），该模式使用 Tool-Using Agent 循环生成代码。

**工具定义**:
- `readFile(path)` — 读取虚拟文件系统中的文件内容
- `writeFile(path, content)` — 写入/覆盖文件
- `runCheck()` — 运行 TypeScript 类型检查（通过 Sandpack 编译器）
- `getErrors()` — 获取当前编译/运行时错误列表
- `done()` — 标记任务完成

**Agent Loop**:
- 最多 15 轮 tool 调用
- 每轮: LLM 输出 Thought 文本 + 可选 tool_call JSON → 系统执行工具 → 返回 Observation → 进入下一轮
- 当 LLM 调用 `done` 或达到最大轮次时退出
- 退出后从虚拟文件系统提取生成的文件更新到 Sandpack

### Requirement: 虚拟文件系统
Agent 操作一个 session 级别的虚拟文件系统。
- 初始化时包含 Sandpack 模板基础文件
- 支持读/写/列出文件
- Session 重置时清空
- 与 Zustand store 同步状态

### Requirement: Agent 面板（Agent Panel）
展示 Agent 循环的每一步：
- 步骤序号和 Thought（LLM 的思考过程）
- 工具调用名称和参数摘要（路径截断、内容截断到前 50 字符）
- 工具返回值（成功/失败状态 + 结果摘要）
- 每步可折叠展开查看完整细节
- 正在进行的步骤显示 loading 动画

### Requirement: Mode 切换更新
InputPanel 增加 "agent" 选项。
- 三种模式: `chat` / `quick` / `agent`
- `code` 模式重命名为 `quick`
- 默认仍为 `quick`

### Requirement: Agent System Prompt
完整的 Agent 角色定义 Prompt，包含：
- 角色: 前端开发 Agent，能读写文件、运行类型检查
- 工作流: 理解需求 → 设计方案 → 写文件 → 检查 → 修复 → 完成
- 工具定义: 每个工具的 JSON schema、参数说明、使用场景
- 输出格式: Thought 文本 + 可选的 `<tool_call>` JSON 块

## MODIFIED Requirements

### Requirement: LLM Provider 解析增强
`llm-provider.ts` 需新增 tool_call 标记的增量解析能力。
- 流式接收时能检测 `<tool_call>` 开始和结束
- 将普通文本（Thought）和 tool_call JSON 分开返回给调用方

### Requirement: 代码生成管线
原 `generateCode` 保留为 quick mode 使用。新增 `runAgentLoop` 函数作为 agent mode 入口。
