# Tool-Using Agent — 从 Prompt→Code 升级为自主 Agent 工具调用

## Summary
将当前单次 `prompt → code` 的 LLM 调用升级为 **Tool-Using Agent 循环**：LLM 通过调用工具（readFile / writeFile / runCheck / getErrors）自主完成 Observe → Think → Act 循环，多步迭代直到任务完成。这是 Agent 领域的核心范式。

## Motivation
- **当前架构问题**: 代码生成完全是 "黑盒输入→输出"，LLM 无法观察自己的输出质量，Self-healing 只是简单的"出错了再调一次"，没有工程深度
- **面试价值**: 字节面试官期待看到的 Agent 能力是 Tool Calling Loop —— 这是 Agent 的定义性特征，不是 prompt engineering
- **用户体验**: 用户能看到 Agent 每一步在做什么（思考→行动→观察），透明可信

## Scope

### In Scope
- LLM 输出 JSON tool calls 而非直接输出代码
- 实现真实工具函数: `readFile`, `writeFile`, `runCheck`, `getErrors`, `done`
- Agent Loop: 多轮 tool 调用直到 LLM 发出 `done`
- 系统 Prompt 定义 Agent 角色和可用工具（function calling format）
- 前端 Agent Panel 展示每一步的 Thought / Action / Observation
- 兼容 React 和 Vue 两种框架场景
- Agent 可主动读取已有文件、精确修改、运行类型检查

### Out of Scope
- 真正的沙箱执行环境（仍用 Sandpack）
- 文件系统级工具（用虚拟文件系统）
- Agent memory / 长期记忆
- Multi-Agent 协作（后续迭代）
- 用户自定义工具
