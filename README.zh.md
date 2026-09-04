# Meet 实时字幕

[English](./README.md) | [中文](./README.zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4.svg)](public/manifest.json)
[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react)](package.json)
[![Vite 6](https://img.shields.io/badge/Vite-6-646CFF.svg?logo=vite)](package.json)

一个 Chrome 扩展，可在侧边栏中捕获 Google Meet 实时字幕。实时查看、搜索、下载和重新上传完整对话记录——内置 AI 助手，助力会议洞察。

## 功能特性

- **实时字幕** — 捕获实时字幕，支持多发言者、彩色头像和智能去重
- **搜索与导出** — 全文搜索，下载会议记录（TXT/SRT/JSON），重新上传历史记录
- **AI 助手** — 使用 OpenAI、Claude、DeepSeek 或 Gemini 对会议内容提问，流式 Markdown 渲染
- **Slack 集成** — 通过 Webhook 将 AI 回复直接发送到 Slack 频道
- **Google 登录** — Google 账号认证，30 天会话，显示用户头像
- **自定义设置** — 三标签页设置（账号、通用、集成），支持主题、字体、导出和通知选项

## 技术栈

- React 19 + Vite 6
- Chrome Extension Manifest V3
- react-markdown + remark-gfm
- CSS 自定义属性（主题）

## 架构

```
内容脚本 (content.js)  ──▶  后台 Service Worker (background.js)  ──▶  侧边栏 (React)
   DOM 字幕提取                    消息路由与存储                       UI 与状态管理
```

## 项目结构

```
meet-live-captions/
├── public/
│   ├── manifest.json      # Chrome 扩展清单（v3）
│   ├── content.js         # 注入 meet.google.com——从 DOM 中提取字幕
│   ├── background.js      # Service Worker——消息路由与存储
│   └── icons/             # 扩展图标
├── sidepanel.html          # 侧边栏入口页面
├── src/
│   ├── App.jsx             # 根组件
│   ├── index.jsx           # React 入口
│   ├── components/         # 展示型 UI 组件
│   ├── containers/         # 有状态视图（字幕列表、AI 聊天、设置）
│   ├── hooks/               # 自定义 Hook（字幕、AI 聊天、认证、设置、提示）
│   ├── services/            # AI 供应商 API 客户端
│   ├── constants/           # 共享常量（消息类型、供应商、默认值）
│   ├── utils/                # 导出与格式化工具
│   └── styles/               # 全局样式
└── vite.config.js          # 构建配置（React 插件、扩展输出）
```

## 快速开始

### 前置要求

- Node.js 18+
- Google Chrome 116+（或支持 Side Panel API 的 Chromium 浏览器）

### 安装

```bash
git clone https://github.com/encoreshao/meet-live-captions.git
cd meet-live-captions
npm install
```

设置环境变量：

```bash
cp .env.example .env
```

编辑 `.env`，添加你的 Google OAuth 客户端 ID（在 [Google Cloud Console → 凭据](https://console.cloud.google.com/apis/credentials) 创建 **Chrome 扩展** 类型的客户端）：

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

构建并加载：

```bash
npm run build
```

然后打开 `chrome://extensions/`，启用**开发者模式**，点击**加载已解压的扩展程序**，选择 `dist/` 文件夹。

### 开发

```bash
npm run dev       # 开发服务器 http://localhost:5173/
npm run preview   # 预览生产构建
```

> Chrome 扩展 API（`chrome.*`）仅在作为扩展加载时可用。

## 使用方法

1. 加入 Google Meet 通话
2. 点击扩展图标打开侧边栏
3. 在 Meet 中打开**实时字幕**（点击 `CC` 或按 `c`）
4. 字幕将实时显示在侧边栏中

### AI 助手

在 **设置 → 集成** 中添加 API 密钥，然后打开 AI 聊天，对会议内容提问——支持可选的会议上下文注入。

## 权限

| 权限 | 用途 |
|------|------|
| `sidePanel` | 显示字幕面板 |
| `storage` | 持久化字幕和设置 |
| `activeTab` / `tabs` | 访问 Meet 标签页并打开侧边栏 |
| `identity` | Google OAuth2 登录 |
| `host_permissions` | Meet 页面访问、AI 供应商 API、Slack Webhook |

## 参与贡献

欢迎贡献代码。提交变更前请：

1. Fork 仓库并创建功能分支
2. 完成修改后使用 `npm run build` 验证构建（可用 `npm run dev` 在 Meet 中手动测试）
3. 提交 Pull Request，说明变更内容及原因

请保持每个 PR 聚焦单一功能或修复，并避免无关的格式改动。

## 支持

- **Bug 反馈与功能建议**：[提交 Issue](https://github.com/encoreshao/meet-live-captions/issues)
- **问题咨询**：使用 [GitHub Discussions](https://github.com/encoreshao/meet-live-captions/discussions) 或提交 Issue

## 许可证

[MIT 许可证](LICENSE)
