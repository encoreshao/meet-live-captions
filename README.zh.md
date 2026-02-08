# Meet 实时字幕

[English](./README.md) | [中文](./README.zh.md)

一个 Chrome 扩展，可在侧边栏中捕获 Google Meet 实时字幕。实时查看和下载完整对话记录。

## 功能特性

- **实时字幕捕获** — 自动检测并捕获 Google Meet 的实时字幕，支持多发言者
- **发言者头像检测** — 从 Meet DOM 中提取发言者头像并显示在字幕旁边
- **彩色发言者标识** — 每个发言者获得独特的颜色和首字母徽章，便于视觉区分
- **原地字幕更新** — 字幕随发言者说话实时更新，避免重复条目
- **全文搜索** — 通过即时搜索功能筛选对话内容
- **下载会议记录** — 以多种格式（TXT、SRT、JSON）导出完整对话，支持自定义选项
- **隐藏 Meet 原生字幕覆盖层** — 切换 Meet 原生字幕覆盖层的显示，同时在侧边栏中继续捕获
- **自动滚动与新消息指示器** — 自动跟随新字幕，滚动时显示视觉指示器
- **设置面板** — 全面的设置选项，包括主题/深色模式、字体大小、紧凑模式、导出选项等
- **会话持久化** — 字幕在侧边栏关闭/重新打开以及页面刷新后仍然保留（同一会议内）

## 技术栈

- **React 19** — 使用 Hooks 和 Context API 的现代 React
- **Vite 6** — 快速的构建工具和开发服务器
- **Chrome Extension Manifest V3** — 最新的扩展平台
- **CSS 自定义属性** — 主题和动态样式

## 项目结构

```
meet-live-captions/
├── public/
│   ├── manifest.json          # 扩展清单文件（Manifest V3）
│   ├── background.js          # Service Worker — 消息路由和存储
│   ├── content.js             # 内容脚本 — DOM 字幕提取
│   └── icons/                 # 扩展图标
├── src/
│   ├── index.jsx              # React 入口点
│   ├── App.jsx                # 主应用 — 视图切换
│   ├── constants/index.js     # 共享常量（颜色、默认值、消息类型）
│   ├── utils/
│   │   ├── format.js          # 时间格式化工具
│   │   └── export.js          # 会议记录导出（TXT/SRT/JSON）
│   ├── hooks/
│   │   ├── useSettings.js     # 设置上下文，使用 chrome.storage.local
│   │   ├── useCaptions.js     # 字幕状态 + chrome.runtime 消息传递
│   │   └── useToast.js        # Toast 通知 Hook
│   ├── components/
│   │   ├── Header.jsx         # 品牌、操作、状态
│   │   ├── SearchBar.jsx      # 搜索输入框，带防抖
│   │   ├── CaptionsList.jsx   # 可滚动的字幕容器
│   │   ├── CaptionMessage.jsx # 单个字幕条目
│   │   ├── SpeakerAvatar.jsx  # 头像图片，带回退
│   │   ├── EmptyState.jsx     # 空状态/无结果状态
│   │   ├── ScrollToBottom.jsx # 新消息指示器
│   │   ├── Footer.jsx         # 统计栏
│   │   ├── Settings.jsx       # 完整设置面板
│   │   └── Toast.jsx          # Toast 通知
│   └── styles/index.css       # 所有样式，使用 CSS 自定义属性
├── sidepanel.html             # Vite 入口 HTML
├── package.json
├── vite.config.js
├── .gitignore
├── LICENSE
├── README.md
└── README.zh.md
```

## 架构

扩展使用三部分架构来捕获和显示字幕：

### 组件

1. **内容脚本** (`public/content.js`)
   - 在 `meet.google.com` 页面上运行
   - 使用 `MutationObserver` 检测字幕区域变化
   - 使用多种解析策略提取发言者姓名和文本（字体大小标记、DOM 结构、回退方案）
   - 从 Meet DOM 检测发言者头像
   - 将字幕更新发送到后台 Service Worker

2. **后台 Service Worker** (`public/background.js`)
   - 在内容脚本和侧边栏之间中继消息
   - 在 `chrome.storage.session` 中持久化字幕，实现会话持久化
   - 管理会议状态和路由

3. **侧边栏** (`src/` - React 应用)
   - 以类似聊天的 UI 渲染字幕
   - 显示发言者头像、时间戳和彩色标识
   - 提供搜索、设置和会议记录下载功能
   - 使用 React 19 和 Vite 6 构建

### 消息流

```
内容脚本  ──CAPTION_UPDATE──▶  后台  ──CAPTION_UPDATE──▶  侧边栏
          ──MEETING_STARTED──▶         ──MEETING_CHANGED──▶
侧边栏    ──GET_CAPTIONS────▶  后台  （返回存储的字幕）
          ──CLEAR_CAPTIONS──▶
          ──TOGGLE_CAPTIONS─▶         ──TOGGLE_CAPTIONS──▶  内容脚本
```

## 快速开始

### 前置要求

- Node.js 18 或更高版本
- npm（随 Node.js 一起安装）
- Google Chrome 116+ 或支持 Side Panel API 的基于 Chromium 的浏览器

### 安装

1. 克隆此仓库：
   ```bash
   git clone https://github.com/encoreshao/meet-live-captions.git
   cd meet-live-captions
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 构建扩展：
   ```bash
   npm run build
   ```
   这会将构建的扩展输出到 `dist/` 目录。

4. 在 Chrome 中加载扩展：
   - 打开 Chrome 并导航到 `chrome://extensions/`
   - 启用**开发者模式**（右上角的切换开关）
   - 点击**加载已解压的扩展程序**
   - 选择项目目录中的 `dist/` 文件夹

### 开发

使用热模块替换进行开发：

```bash
npm run dev
```

这将启动 Vite 开发服务器。请注意，进行更改后仍需要在 Chrome 中重新加载扩展才能看到更改效果。

## 使用方法

1. 加入 Google Meet 通话
2. 点击 Chrome 工具栏中的扩展图标以打开侧边栏
3. 在 Google Meet 中打开**实时字幕**（点击 `CC` 按钮或按 `c`）
4. 字幕将实时显示在侧边栏中

### 工具栏操作

| 按钮 | 操作 |
|------|------|
| 眼睛 | 切换 Meet 原生字幕覆盖层的可见性 |
| 下载 | 以配置的格式（TXT/SRT/JSON）导出会议记录 |
| 垃圾桶 | 清除所有捕获的字幕 |
| 设置 | 打开设置面板 |

## 设置

扩展提供全面的设置，按类别组织：

### 外观

| 设置 | 选项 | 说明 |
|------|------|------|
| 主题 | 自动、浅色、深色 | 侧边栏的颜色主题 |
| 字体大小 | 12px、13px、14px、15px、16px | 字幕的基础字体大小 |
| 紧凑模式 | 开/关 | 减少间距以实现更紧凑的显示 |

### 字幕行为

| 设置 | 选项 | 说明 |
|------|------|------|
| 自动隐藏 Meet 字幕 | 开/关 | 自动隐藏 Meet 的原生字幕覆盖层 |
| 自动滚动到底部 | 开/关 | 自动滚动到最新字幕 |
| 合并相同发言者 | 开/关 | 合并来自同一发言者的连续字幕 |

### 导出

| 设置 | 选项 | 说明 |
|------|------|------|
| 格式 | TXT、SRT、JSON | 默认导出格式 |
| 包含时间戳 | 开/关 | 在导出的会议记录中包含时间戳 |
| 包含发言者 | 开/关 | 在导出的会议记录中包含发言者姓名 |

### 通知

| 设置 | 选项 | 说明 |
|------|------|------|
| 声音通知 | 开/关 | 新字幕到达时播放声音 |
| 徽章计数 | 开/关 | 在扩展图标上显示字幕计数徽章 |

### 存储

| 设置 | 选项 | 说明 |
|------|------|------|
| 自动保存会议记录 | 开/关 | 定期自动保存会议记录 |
| 最大字幕数 | 无限制、100、500、1,000、5,000 | 内存中保留的最大字幕数量 |
| 会议结束时清除 | 开/关 | 会议结束时自动清除字幕 |

### 无障碍

| 设置 | 选项 | 说明 |
|------|------|------|
| 高对比度 | 开/关 | 增加对比度以提高可见性 |
| 减少动画 | 开/关 | 为减少动画偏好禁用动画 |

## 权限

| 权限 | 原因 |
|------|------|
| `sidePanel` | 显示字幕会议记录面板 |
| `storage` | 在会话存储中持久化字幕，在本地存储中保存设置 |
| `activeTab` | 访问活动标签页以打开侧边栏 |
| `tabs` | 检测 Google Meet 标签页并中继消息 |
| `host_permissions: meet.google.com` | 在 Meet 页面上运行内容脚本 |

## 浏览器支持

- Google Chrome 116+（需要 Side Panel API 和 Manifest V3）
- 支持 Side Panel 的基于 Chromium 的浏览器（Edge、Brave 等）

## 许可证

本项目采用 [MIT 许可证](LICENSE) 授权。
