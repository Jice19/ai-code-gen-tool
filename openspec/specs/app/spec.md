# App Specification: AI Code Generator

## Overview
面向前端开发者的 AI 代码生成工具。用户输入自然语言需求，系统调用 LLM 生成可运行的代码文件，支持预览、迭代修改和导出。

## Requirements

### Requirement: 需求输入
用户应能在输入面板中用自然语言描述需求，并选择目标框架和语言。
- 提供 Markdown/纯文本输入框
- 支持选择目标框架（React / Vue / Nuxt / Next）
- 支持选择语言（TypeScript / JavaScript）
- 输入框支持多行文本，最小高度 120px

#### Scenario: 用户输入需求并选择 React + TypeScript
- Given 用户在输入框中输入 "创建一个数据表格组件，支持排序和分页"
- When 用户选择框架为 React，语言为 TypeScript
- And 用户点击"生成代码"按钮
- Then 系统应将需求发送至 Agent 层进行处理

### Requirement: 代码生成
系统应调用 LLM API 生成代码，并以流式方式返回结果。
- 生成内容包括：组件代码、样式、类型定义
- 支持流式输出，实时显示生成进度
- 显示 Token 消耗量
- 平均生成耗时 < 30s

#### Scenario: 流式生成 React 组件代码
- Given 用户提交了需求描述
- When Agent 层调用 LLM API
- Then 前端应实时展示生成的代码片段
- And 生成完成后展示完整代码

### Requirement: 代码预览
系统应提供代码预览功能，让用户查看生成效果。
- iframe / Sandpack 实时预览 React 组件
- 代码编辑器展示，支持语法高亮
- 显示文件树结构

#### Scenario: 预览生成的组件
- Given 系统已生成 React 组件代码
- When 用户切换到"预览"标签
- Then 应在预览面板中渲染该组件
- And 组件应可交互

### Requirement: 迭代修改
用户应能通过对话方式对生成结果提出修改意见。
- 多轮对话输入
- 支持在生成代码基础上手动编辑
- 支持修改建议的增量应用

#### Scenario: 用户要求修改生成的组件
- Given 系统已生成一个数据表格组件
- When 用户在对话栏输入 "请添加搜索功能"
- Then 系统应基于已有代码进行增量修改
- And 保留用户满意的部分

### Requirement: 导出
用户应能导出生成的代码。
- 一键复制代码到剪贴板
- 下载单个文件或整个项目 ZIP
- 导出时保持文件结构完整

#### Scenario: 下载生成的项目
- Given 系统已生成一套代码文件
- When 用户点击"下载 ZIP"
- Then 系统应打包所有文件为 ZIP 并触发下载
