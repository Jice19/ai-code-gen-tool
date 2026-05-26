# App Spec — Chat 模式 + Vue 支持

## Mode: Chat
- 用户选择 Chat 模式后，InputPanel 仅显示文本输入框
- 发送消息后，LLM 返回 markdown 格式文本回复
- 回复以 assistant 消息形式流式追加到 ChatPanel 对话框中
- 支持多轮对话，自动携带历史上下文

## Mode: Code
- 用户选择 Code 模式后，InputPanel 显示 Framework 选择器（React / Vue）和 Language 选择器（TypeScript / JavaScript）
- 选择 React + TS 时，现有行为不变
- 选择 Vue 时：
  - LLM 生成 Vue 3 `<script setup lang="ts">` 单文件组件（SFC）
  - 代码在 Monaco Editor 流式展示，语法高亮为 `vue`
  - PreviewPanel 使用 Sandpack `vue-ts` template 渲染

## Framework 行为
- React：现有行为，PreviewPanel 注入 `/index.tsx` 入口，`createRoot`
- Vue：PreviewPanel 注入 `/App.vue` 主组件 + `/index.ts` 入口 `createApp(App).mount("#app")`
- 两种框架均支持多文件生成（`// file:` 分隔符）
- 两种框架均使用 Tailwind CSS

## Chat 模式流式输出
- 对话时 LLM 不输出代码分隔符，直接输出 markdown 文本
- 用户可随时切换到 Code 模式进行组件生成
- 切换模式不清空已有历史和生成结果
