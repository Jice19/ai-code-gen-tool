# AI Code Gen 优化路线图 v2

## 一、Agent 侧优化

### 1.1 Prompt 质量提升 ✓

**当前问题**:
- Vue System Prompt 中错误地写了 "Every useState MUST have an initial value"（Vue 没有 useState）
- 没有 few-shot 示例，依赖大量文字规则约束 LLM 输出格式
- 防御性解析代码（stripMarkdownFences、extractMarkdownCodeBlocks）占了 generate.ts 大量篇幅

**优化方案**:
1. 修复 Vue prompt 中的 React 专有术语 → 改为 Vue 专有概念
2. 在 System Prompt 中加入 1-2 个 high-quality few-shot 示例（输入→输出），格式约束效果远超文字描述
3. 加入负面示例：展示错误输出，明确 "Do NOT do this"
4. 提供 prompt 模板预设（表单、列表、仪表盘等场景）

**涉及文件**: `src/agent/prompts.ts`

---

### 1.2 两阶段 Plan→Code 生成

**当前问题**: 单次 LLM 调用直接从需求生成代码，复杂需求质量不稳定。

**优化方案**:
在 System Prompt 中引入 "先计划、后编码" 的两阶段模式：
1. Phase 1: LLM 输出 `// plan:` 注释块 → 组件树、state 设计、事件流
2. Phase 2: 基于 plan 生成完整代码

不用两次 LLM 调用，通过 prompt engineering 在单次调用中完成。

**涉及文件**: `src/agent/prompts.ts`、`src/agent/generate.ts`

---

### 1.3 增量流式解析

**当前问题**: `generate.ts` 等 fullContent 完整返回后才 `parseGeneratedFiles`，用户在流式过程中看到的是原始文本而非文件结构。

**优化方案**:
在 streaming 过程中实时检测 `// file: xxx.ext` 分隔符：
- 新文件开始时切换 tab
- CodeEditor 中实时展示"已生成到第 N 个文件"
- 提前构建文件结构，流式追加各文件内容

**涉及文件**: `src/agent/generate.ts`、`src/stores/codeGenStore.ts`、`src/components/CodeEditor.tsx`

---

### 1.4 Self-Healing 增强

**当前状态**: 已完成基础 self-healing — 区分 AI 错误（3s 立即修复）和用户编辑错误（10s 延迟修复）。

**优化方向**:

#### a. 修复策略降级
- 第 1 次尝试：完整修复所有错误
- 第 2 次尝试：要求 LLM 只输出有变化的文件
- 第 3 次尝试：回退到仅修复第一个错误

#### b. 错误分类路由
- 编译错误（语法、import 缺失）→ 精准修复 prompt
- 运行时错误（undefined access、type mismatch）→ 防御性编程 prompt
- 每种错误类型有专门的 fix 策略

#### c. Diff 展示
- 修复完成后在 UI 中展示 before/after diff
- 用户可接受或拒绝修复

**涉及文件**: `src/agent/prompts.ts`、`src/agent/generate.ts`、`src/components/PreviewPanel.tsx`

---

### 1.5 Streaming Resilience（断点续传）

**当前问题**: SSE 连接断开后已接收内容全部丢失。

**优化方案**:
1. 流式接收时记录 checkpoint
2. 断连后带 exponential backoff 自动重连
3. 通过 messages + 已接收内容构造续传上下文

**涉及文件**: `src/agent/llm-provider.ts`、`src/agent/generate.ts`

---

### 1.6 Token-aware 上下文管理

**当前问题**:
- `MAX_PREVIOUS_CODE_LENGTH = 8000` 硬编码字符截断
- 聊天历史 `slice(-20)` 不准确
- 不同模型 context window 差异大

**优化方案**:
1. 按模型 context window 动态计算可用 budget
2. 长对话用 sliding window + 摘要替代粗暴丢弃
3. UI 显示 token 使用率

**涉及文件**: `src/agent/prompts.ts`、`src/agent/generate.ts`

---

## 二、前端侧优化

### 2.1 Monaco 编辑器可编辑

**当前问题**: `CodeEditor.tsx` 配置为 `readOnly: true`，用户无法直接修改代码。

**优化方案**:
1. 改为可编辑模式
2. 用户编辑同步回 `generatedFiles` store
3. `isGenerating=true` 时保持只读
4. 用户编辑后 Sandpack 热更新自动触发

**涉及文件**: `src/components/CodeEditor.tsx`、`src/stores/codeGenStore.ts`

---

### 2.2 Toast 通知系统

**当前问题**: 所有错误提示用原生 `alert()` 弹窗，体验差。

**优化方案**:
1. 基于 zustand slice 实现轻量 Toast 系统（~30 行）
2. 支持 success / error / info 三种类型
3. 自动消失 + 手动关闭
4. 替换所有 alert() 调用

**涉及文件**: `src/stores/codeGenStore.ts`（新增 toast slice）、`src/components/Toast.tsx`（新增）、`src/App.tsx`

---

### 2.3 生成历史 / Undo

**当前问题**: 每次生成覆盖之前的结果，无法回退。

**优化方案**:
1. store 中增加 `generationHistory: GeneratedFile[][]`
2. 每次新生成 push 当前 files 到 history
3. UI 上加 ← → 箭头切换历史版本

**涉及文件**: `src/stores/codeGenStore.ts`、`src/components/CodeEditor.tsx`

---

### 2.4 键盘快捷键

**当前问题**: 所有操作依赖鼠标点击。

**优化方案**:
- `Cmd/Ctrl + Enter` → 触发生成
- `Cmd/Ctrl + K` → 聚焦输入框
- `Cmd/Ctrl + Shift + C` → 取消生成
- 全局 `useEffect` 监听 keydown

**涉及文件**: `src/App.tsx` 或新增 `src/lib/keybindings.ts`

---

### 2.5 Error Boundary

**当前问题**: 任何组件渲染报错 → 整个白屏。

**优化方案**:
1. 创建 `ErrorBoundary` class component
2. 在 App 外层包裹
3. 友好的 fallback UI + "Reload" 按钮

**涉及文件**: `src/components/ErrorBoundary.tsx`（新增）、`src/main.tsx`

---

### 2.6 响应式布局

**当前问题**: 左右侧边栏固定 w-80，小屏幕拥挤。

**优化方案**:
1. 左右侧边栏可折叠（toggle button）
2. 右侧 ChatPanel 在窄屏下变为底部 Sheet
3. 面板宽度可拖拽调整

**涉及文件**: `src/App.tsx`、`src/components/ChatPanel.tsx`、`src/components/InputPanel.tsx`

---

### 2.7 Token 用量可视化

**当前问题**: Token 消耗只在 ChatPanel 小字里展示。

**优化方案**:
1. Header 区域展示 session 累计 token + 成本估算
2. 按 provider 定价计算（OpenAI GPT-4o $2.5/1M input, Anthropic $3/1M input 等）
3. 小进度条显示 context window 使用率

**涉及文件**: `src/App.tsx`、`src/stores/codeGenStore.ts`

---

## 三、工程质量

### 3.1 代码架构解耦

**当前问题**: `generate.ts` 中所有函数通过 `useCodeGenStore.getState()` 直接读写 store，agent 层和 UI 层强耦合。

**优化方案**:
1. `generateCode` 改为接收参数、返回结果的纯函数
2. store 的读写操作移到 App.tsx 或 custom hook 中
3. Agent 层变成可独立测试的纯逻辑层

**涉及文件**: `src/agent/generate.ts`、`src/App.tsx`

---

## 四、实施优先级

| 优先级 | 优化项 | 成本 | 收益 | 状态 |
|--------|--------|------|------|------|
| P0 | Toast 替代 alert | 低 | 高 | 待实施 |
| P0 | Prompt few-shot + 修 bug | 低 | 极高 | 待实施 |
| P0 | Monaco 可编辑 | 低 | 极高 | 待实施 |
| P0 | Error Boundary | 低 | 高 | 待实施 |
| P1 | 键盘快捷键 | 低 | 高 | 待实施 |
| P1 | 生成历史/Undo | 中 | 高 | 待实施 |
| P1 | 两阶段 Plan→Code | 中 | 高 | 待实施 |
| P1 | Self-Healing diff 展示 | 中 | 高 | 待实施 |
| P2 | 增量流式解析 | 中 | 中 | 待实施 |
| P2 | 错误分类修复策略 | 中 | 中 | 待实施 |
| P2 | Token 用量可视化 | 低 | 中 | 待实施 |
| P3 | 响应式布局 | 高 | 中 | 待实施 |
| P3 | 代码解耦 | 高 | 长期高 | 待实施 |

## 五、当前已有亮点（已实现）

| 模块 | 亮点 |
|------|------|
| **SSE Streaming Client** | 手写 SSE 解析，兼容 OpenAI / Anthropic / DeepSeek 三种 wire format，零 LLM SDK 依赖 |
| **Self-Healing Loop** | 区分 AI 生成错误（3s 立即修复）和用户编辑错误（10s 延迟修复），最多 3 次重试 |
| **Dual-Mode Architecture** | Chat 模式（Markdown 流式对话）+ Code 模式（文件级代码生成） |
| **Multi-File Parsing Pipeline** | 四层容错：分隔符 → fence 剥离 → 代码块回退 → 组件名推断 |
| **Virtual Scrolling Chat** | @tanstack/react-virtual + 动态高度 + 流式自动追底 |
| **Sandpack Preview** | React / Vue 多模板，多文件组装 + Tailwind CDN 注入 |
| **Monaco Editor** | 流式内容实时展示 + 多 tab 文件浏览 + 自动追底滚动 |
| **Zustand Store** | 单一 store 管理 input / generation / self-healing / chat 四域 |
| **Export Pipeline** | 单文件下载 / 多文件 ZIP / 剪贴板复制 + fallback |
