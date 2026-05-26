# 技术设计 — Chat 模式 + Vue 支持

## Decision: 轻量 message 级路由，不复用 code 生成管道

对话模式的 LLM 响应是纯文本 markdown，不经过代码解析器（`parseGeneratedFiles`）。两条路径在 `generate.ts` 中分流：

```
runGeneration(config, userMessage?)
  ├─ mode="chat" → streamText(config, messages) → appendChatContent(assistantId, chunk)
  └─ mode="code" → streamCode(config, messages) → appendStreamingContent + parseGeneratedFiles
```

**理由**：对话文本不需要文件解析、不需要 token 统计、不需要存入 `generatedFiles` 列表。强行混用会增加不必要的复杂度。

## Decision: Store 中 `mode` 与 `framework` 状态扩展

```typescript
mode: "chat" | "code"
framework: "react" | "vue"  // 替换原 "react" 字面量
```

**理由**：`mode` 决定 LLM 走哪套 prompt；`framework` 决定代码生成 prompt 的模板语言和 Sandpack template。

## Decision: Vue 3 生成策略

System prompt 要求输出 Vue 3 Composition API + `<script setup>` + Tailwind CSS。Sandpack 使用 `vue-ts` template。Vue 组件注入方式与 React 不同：

- React Sandpack：`index.tsx` 导入 `App`，`createRoot(...).render(<App />)`
- Vue Sandpack：`App.vue` 作为主组件，`index.ts` 通过 `createApp(App).mount("#app")`

## Decision: 两套 System Prompt

| 模式 | Prompt 特征 |
|------|-------------|
| Chat | "你是一个资深前端开发助手"，输出 markdown 格式文本，不输出代码块 |
| Code (React) | 现有 prompt + 扩展，含多文件分隔符规则 |
| Code (Vue) | Vue 3 `<script setup lang="ts">` + Tailwind，同样支持多文件分隔符 |

## Decision: UI 重构

- **Chat 模式**：左侧 InputPanel 简化为纯文本输入框（无 Language/Framework 选择器），生成内容流式追加到 ChatPanel
- **Code 模式**：保持现有布局，InputPanel 下方增加 Framework 选择器（React / Vue），流式输出到 Monaco
- 模式切换：header 或 InputPanel 顶部放 toggle 按钮
