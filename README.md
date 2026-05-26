# AI Code Gen

基于自然语言描述，即时生成生产级 React / Vue 3 组件的 AI Coding 工具。

## 核心能力

- **自然语言生成组件** — 输入描述，输出可直接使用的 React 或 Vue 3 组件代码
- **流式实时输出** — 代码逐字流式渲染，所见即所得
- **在线预览** — 基于 Sandpack 的组件实时渲染，无需离开浏览器
- **Monaco 编辑器** — 与 VSCode 一致的编辑体验，支持语法高亮与智能提示
- **多文件协同生成** — 自动拆分 Hooks、子组件、类型定义等模块
- **Chat 模式** — 前端技术问答，返回结构化 Markdown
- **一键导出** — 复制、单文件下载、多文件 ZIP 打包
- **多 LLM 供应商** — 兼容 OpenAI / Anthropic / DeepSeek，支持自定义 Base URL

## 技术栈

| 层级 | 选型 |
|------|------|
| 框架 | React 19 |
| 构建 | Vite 8 |
| 语言 | TypeScript 6 |
| 样式 | Tailwind CSS 4 |
| 编辑器 | Monaco Editor |
| 在线预览 | Sandpack (CodeSandbox) |
| 状态管理 | Zustand |
| LLM 通信 | 基于 `fetch` 的自研 SSE 流式客户端 |

## 快速开始

### 环境要求

- Node.js 18+
- 任一 LLM 供应商的 API Key

### 安装

```bash
git clone <repo-url>
cd ai-code-gen-tool
npm install
```

### 配置 API Key

**方案一：环境变量（推荐）**

```bash
cp .env.example .env
# 编辑 .env 填入 API Key
VITE_API_KEY=sk-your-api-key-here
```

**方案二：界面配置**

在应用的 Settings 面板中填写，Key 存储于浏览器 `localStorage`。

### 运行

```bash
npm run dev          # 启动开发服务器
npm run dev:server   # 启动开发服务器 + Hono 后端代理
```

### 构建

```bash
npm run build
npm run preview
```

## LLM 供应商

| 供应商 | 模型示例 |
|--------|----------|
| OpenAI | `gpt-4o`, `gpt-4o-mini` |
| Anthropic | `claude-sonnet-4-6`, `claude-opus-4-6` |
| DeepSeek | `deepseek-v4-pro`, `deepseek-v4-flash` |

支持自定义 Base URL，可接入 OpenRouter、本地模型等任意兼容接口。

## 使用流程

1. 输入组件描述（例：「一个带拖拽功能的看板」）
2. 选择框架 **React** / **Vue**，语言 **TypeScript** / **JavaScript**
3. 点击 **Generate**，代码实时流式输出
4. 在 **Code**（编辑器）与 **Preview**（预览）面板间切换
5. 通过 **Download** / **Copy** / **ZIP All** 导出成果

## 项目结构

```
src/
  agent/         提示词工程、LLM 流式客户端、代码解析器
  components/    UI 组件（InputPanel, CodeEditor, PreviewPanel, ChatPanel 等）
  lib/           工具函数（cn 工具、常量）
  stores/        Zustand 状态管理
  types/         TypeScript 类型定义
server/          Hono 后端代理（可选）
```
