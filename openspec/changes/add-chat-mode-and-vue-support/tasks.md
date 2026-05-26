# Tasks — Chat 模式 + Vue 支持

## Implementation

- [x] 1. 扩展 Store：`mode` 状态、`Framework` 类型扩展为 `"react" | "vue"`、`chatTextResponse` 字段
- [x] 2. 新增 Chat 和 Vue 两套 system prompt（`prompts.ts`）
- [x] 3. Agent 层分流：`generate.ts` 根据 mode 走文本流或代码流
- [x] 4. UI — InputPanel 增加 mode toggle + framework selector（code 模式显示）
- [x] 5. UI — ChatPanel 支持流式渲染 assistant 消息（Markdown）
- [x] 6. UI — PreviewPanel 根据 framework 动态切换 Sandpack template
- [x] 7. App.tsx 集成双模式逻辑，文本/代码走不同渲染路径
- [x] 8. 端到端验证：chat 对话 → Vue 3 组件生成 → Sandpack 预览

## Progress

| # | Task | Status |
|---|------|--------|
| 1 | Store 扩展 | ✅ |
| 2 | Prompt 扩展 | ✅ |
| 3 | Agent 分流 | ✅ |
| 4 | InputPanel 改造 | ✅ |
| 5 | ChatPanel 流式渲染 | ✅ |
| 6 | PreviewPanel 动态 template | ✅ |
| 7 | App.tsx 集成 | ✅ |
| 8 | E2E 验证 | ✅ |
