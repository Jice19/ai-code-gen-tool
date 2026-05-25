# 技术设计 — MVP v1

## Decision: 直连 LLM，简化后端
MVP 前端直接调用 Agent 层的 LLM Provider，不经过后端中转。降低复杂度，后续版本再加后端 BFF 层。

## Decision: Sandpack 而非 iframe
使用 @codesandbox/sandpack-react 提供安全沙箱预览，比裸 iframe 更安全，且内置 React/TS 支持。

## Decision: 单包项目而非 monorepo
MVP 使用单个 Vite + React 项目，agent 逻辑作为 src/agent/ 子目录。后端仅保留轻量 Hono 服务用于 ZIP 导出。
