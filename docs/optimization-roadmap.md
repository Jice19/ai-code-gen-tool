# Agent 优化路线图

## 1. 结构化输出替代手写 Parser

**当前问题**: `src/agent/generate.ts` 中用正则表达式解析 LLM 输出（`// file:` 分隔符、markdown fence 剥离、代码块回退提取、组件名推断），约 100 行容错逻辑，脆弱且难维护。

**方案**: 使用 LLM 的 **tool calling / JSON mode** 直接返回结构化数据：

```json
{
  "files": [
    { "name": "Button.tsx", "content": "import { useState } from ...", "language": "typescript" }
  ]
}
```

**收益**:
- 删除 `stripMarkdownFences`、`extractMarkdownCodeBlocks`、正则匹配等 ~100 行代码
- 解析变为 `JSON.parse` 一行
- 不再有 LLM "不听话"（输出 markdown fence）的问题
- 几乎所有主流模型都支持 structured output

**涉及文件**: `src/agent/generate.ts`、`src/agent/llm-provider.ts`、`src/agent/prompts.ts`

---

## 2. Error Feedback Loop（自我修复）

**当前问题**: 代码生成完就结束，不做任何验证。

**方案**:
1. 生成的文件注入 Sandpack → 捕获编译错误
2. 将错误信息作为 follow-up message 回传 LLM
3. LLM 自行修复后重新生成
4. 最多重试 N 轮（建议 3 轮），每轮展示 diff

**收益**:
- 大幅减少"生成完了但有语法错误"的坏体验
- "Agent 能自主修复代码"是面试时非常有说服力的亮点
- 可以在 UI 中展示修复过程（每轮显示 "Detected 3 errors, attempting fix..."）

**涉及文件**: `src/agent/generate.ts`、`src/components/PreviewPanel.tsx`

---

## 3. 流式重连与断点续传

**当前问题**: `src/agent/llm-provider.ts` 的 `streamGenerate` 中，SSE 连接一断，所有已接收内容丢失。

**方案**:
1. 流式接收时在 store 中记录已接收内容 checkpoint
2. 连接断开后带 exponential backoff 自动重试
3. 通过 messages + 已接收内容构造续传上下文
4. 重试次数上限 + 用户可见状态

**收益**:
- 体现对 SSE / Fetch Streams API 的工程深度
- 长生成任务不再"功亏一篑"
- 可配置重试策略（次数、间隔）

**涉及文件**: `src/agent/llm-provider.ts`、`src/agent/generate.ts`、`src/stores/codeGenStore.ts`

---

## 4. Token-aware 上下文管理

**当前问题**:
- `MAX_PREVIOUS_CODE_LENGTH = 8000` 硬编码字符截断
- 聊天历史 `slice(-20)` 粗暴截断
- 不同模型 context window 差异巨大（DeepSeek 8k vs Claude 200k）

**方案**:
1. 集成 `tiktoken`（或对应模型的 tokenizer）做精确 token 计数
2. 按模型 context window 动态计算可用 budget
3. 长对话用 sliding window + LLM 摘要替代粗暴丢弃
4. 生成时显示 token 使用率

**收益**:
- 大 context 模型能利用更多上下文
- 小 context 模型不会超出限制
- 技术深度体现

**涉及文件**: `src/agent/prompts.ts`、`src/agent/generate.ts`、`src/lib/constants.ts`

---

## 5. Provider Fallback 链路

**当前问题**: 只支持单一 provider，挂了就报错。

**方案**:
1. 用户可配置主/备 provider 和 model
2. 主 provider 失败（429 限流、超时、5xx）自动降级到备选
3. UI 中显示当前使用哪个 provider
4. 降级事件记录

**收益**:
- 提升可用性
- 热切换对用户透明
- 适合生产级应用

**涉及文件**: `src/agent/llm-provider.ts`、`src/components/ApiSettings.tsx`、`src/stores/codeGenStore.ts`

---

## 前端已有亮点

| 模块 | 亮点 |
|------|------|
| **SSE Streaming Client** | 手写 SSE 解析，兼容 OpenAI / Anthropic / DeepSeek 三种 wire format，零 LLM SDK 依赖 |
| **Dual-Mode Architecture** | Chat 模式（Markdown 流式对话）+ Code 模式（文件级代码生成），共用 streaming + store 基础设施 |
| **Multi-File Parsing Pipeline** | 四层容错：多文件分隔符 → markdown fence 剥离 → 代码块回退 → 组件名推断 |
| **Virtual Scrolling Chat** | `@tanstack/react-virtual` + 动态高度测量 + 流式内容自动追底 |
| **Sandpack Preview** | React / Vue 多模板，多文件组装 + Tailwind CDN 注入 |
| **Monaco Editor** | 流式生成内容实时展示 + 完成后多 tab 文件浏览 |
| **Zustand Store** | 单一 store 管理 input / generation / chat 三域，内置 AbortController |
| **Export Pipeline** | 单文件下载 / 多文件 ZIP 打包 / 剪贴板复制 + fallback |

---

## 实施优先级建议

| 优先级 | 优化项 | 理由 |
|--------|--------|------|
| P0 | Structured Output | 改动小、代码量反而减少、立竿见影 |
| P1 | Error Feedback Loop | 最具 agentic 特性、面试叙事最有力 |
| P2 | Streaming Resilience | 工程深度、用户感知强 |
| P3 | Token-aware Context | 技术深度、大上下文模型场景收益大 |
| P4 | Provider Fallback | 锦上添花、生产环境需要 |
