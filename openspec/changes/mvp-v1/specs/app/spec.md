# Delta Spec — MVP v1

## ADDED Requirements

### Requirement: 需求输入面板
用户应能输入自然语言需求并选择目标框架与语言。
- 文本输入框（Markdown 支持，最小高度 120px）
- 框架下拉选择：React
- 语言下拉选择：TypeScript / JavaScript
- "生成代码" 提交按钮

### Requirement: 流式代码生成
系统应调用 LLM API 流式生成代码，实时展示进度。
- 支持 OpenAI / Anthropic provider
- 流式 chunk 实时追加到编辑器
- 生成完成后显示 Token 用量

### Requirement: Monaco Editor 代码展示
生成的代码应在 Monaco Editor 中展示，具备语法高亮。
- 支持 TSX/JSX/TS/JS/CSS 语法高亮
- 只读模式（可切换为编辑模式以手动修改）
- 单文件展示

### Requirement: Sandpack 预览
生成的 React 组件应能在 Sandpack 沙箱中实时预览。
- 自动注入 Tailwind CSS
- 组件可交互
- 代码变更后自动刷新

### Requirement: 多轮对话迭代
用户应能通过对话面板对生成结果提出修改意见。
- 对话历史展示
- 流式修改响应
- 对话中引用当前代码上下文

### Requirement: 代码导出
用户应能复制或下载生成的代码。
- 一键复制当前文件内容
- 下载为 .tsx/.jsx 文件
- 如有多个文件，打包为 ZIP 下载
