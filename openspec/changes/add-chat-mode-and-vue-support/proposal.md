# 支持对话模式 + Vue3 代码生成

## Summary
将单一代码生成器升级为双模式工具：
- **对话模式**：LLM 返回纯文本回复，在 ChatPanel 中展示，适合问答和技术讨论
- **代码生成模式**：同时支持 React 19 和 Vue 3 组件生成，代码在 Monaco Editor 流式展示，Sandpack 实时预览

## Motivation
当前工具只能生成 React 组件，每次对话都会触发代码生成流程。用户缺少：
1. 与 AI 的纯文本对话能力（问技术问题、设计方案讨论等）
2. Vue 3 前端框架的支持，限制了适用范围

## Scope

### In Scope
- Chat / Code 双模式切换
- 对话模式：纯文本流式回复，追加到 ChatPanel 消息列表
- 代码生成模式：React 19 + Vue 3（Composition API + `<script setup>`）
- Framework 选择器（代码模式下显示）
- 对话模式复用 ChatPanel 输入框，代码模式复用现有 InputPanel
- Vue 3 Sandpack 预览

### Out of Scope
- 多模态（截图生码）
- Svelte / Angular / Nuxt 等其他框架
- 对话模式下的代码高亮（需要消息级渲染能力，后续迭代）
