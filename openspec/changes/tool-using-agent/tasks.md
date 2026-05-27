# Tasks — Tool-Using Agent

## Implementation



- [x] 1. 类型定义 — Agent Loop 相关类型（ToolCall, ToolResult, AgentStep, VirtualFS）
- [x] 2. 虚拟文件系统 — VirtualFS 类实现（readFile, writeFile, listFiles）
- [x] 3. 工具注册表 — Tool registry + 每个工具的 execute 函数（readFile, writeFile, runCheck, getErrors, done）
- [x] 4. Agent System Prompt — 构建 Agent 角色 + 工具 schema + 工作流指令
- [x] 5. Agent Loop 核心 — `runAgentLoop()` 函数（while 循环, tool_call 解析, 工具执行, 对话构建）
- [x] 6. 流式解析增强 — `llm-provider.ts` 支持检测 `<tool_call>` 标记，分离 Thought 与 Action
- [x] 7. Mode 切换 — InputPanel 增加 agent 选项，code→quick 重命名，Zustand store 更新
- [x] 8. Agent Panel UI 组件 — 可折叠步骤卡片，展示 Thought / Action / Observation
- [x] 9. Agent Loop 集成到 App — `runGeneration` 中 agent mode 分支调用 `runAgentLoop`
- [ ] 10. 端到端测试 — Agent 生成完整组件流程验证

## Progress

| # | Task | Status |
|---|------|--------|
| 1 | Type Definitions | ⬜ |
| 2 | Virtual FS | ⬜ |
| 3 | Tool Registry | ⬜ |
| 4 | Agent System Prompt | ⬜ |
| 5 | Agent Loop Core | ⬜ |
| 6 | Streaming Parser Enhancement | ⬜ |
| 7 | Mode Switch | ⬜ |
| 8 | Agent Panel UI | ⬜ |
| 9 | App Integration | ⬜ |
| 10 | E2E Test | ⬜ |
