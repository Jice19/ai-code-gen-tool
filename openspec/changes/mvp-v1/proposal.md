# MVP v1 — AI Code Generator 第一版

## Summary
实现 MVP 范围内的 AI 代码生成工具。聚焦 React 组件生成（TS + Tailwind），单文件预览，多轮对话修改，复制/下载导出。

## Motivation
基于需求文档 v1.0，快速交付可用的 MVP 版本，验证核心链路：需求输入 → AI 生成 → 预览 → 迭代 → 导出。

## Scope

### In Scope
- React 19 + TypeScript + Tailwind CSS 4 前端应用
- 自然语言输入面板 + 框架/语言选择器
- LLM 流式代码生成（直连 OpenAI/Anthropic API）
- Monaco Editor 代码展示（语法高亮）
- Sandpack 实时预览
- 多轮对话迭代修改
- 一键复制 / 下载 ZIP

### Out of Scope
- 截图理解（多模态）
- 上传现有代码作为上下文
- GitHub 推送
- Vue/Nuxt/Next 框架生成
- 完整测试覆盖
