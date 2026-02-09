# Meet 实时字幕

[English](./README.md) | [中文](./README.zh.md)

一个 Chrome 扩展，可在侧边栏中捕获 Google Meet 实时字幕。实时查看、搜索、下载和重新上传完整对话记录——内置 AI 助手，助力会议洞察。

## 功能特性

### 字幕捕获
- **实时字幕捕获** — 自动检测并捕获 Google Meet 的实时字幕，支持多发言者
- **发言者头像检测** — 从 Meet DOM 中提取发言者头像并显示在字幕旁边
- **彩色发言者标识** — 每个发言者获得独特的颜色和首字母徽章，便于视觉区分
- **原地字幕更新** — 字幕随发言者说话实时更新，智能续句检测保留历史记录
- **字幕持久化** — 字幕在侧边栏关闭/重新打开、页面刷新和 URL 变化后仍然保留，直到用户手动清除
- **会议结束检测** — 多层检测机制（URL、DOM、标签关闭）在您离开会议时自动停止计时器

### 搜索与导出
- **全文搜索** — 通过即时防抖搜索筛选对话内容
- **下载会议记录** — 以 TXT、SRT 或 JSON 格式导出完整对话，支持自定义选项
- **上传会议记录** — 重新上传之前下载的会议记录文件（JSON、TXT 或 SRT），在查看器中恢复完整的会议历史
- **隐藏 Meet 原生字幕覆盖层** — 切换 Meet 原生字幕覆盖层的显示，同时在侧边栏中继续捕获

### AI 助手
- **内置 AI 聊天** — ChatGPT 风格的界面，可针对会议内容提问
- **多供应商支持** — OpenAI、Claude、DeepSeek 和 Gemini，实时获取可用模型
- **流式响应** — 实时流式输出，支持 Markdown 渲染（标题、列表、代码块、表格）
- **会议上下文注入** — 可选将近期字幕作为上下文，获得更相关的 AI 回答
- **快速提示** — 一键建议如"总结会议内容"或"列出待办事项"，自动发送
- **复制与 Slack** — 复制 AI 回复到剪贴板或直接发送到 Slack 频道

### 界面与设置
- **自动滚动与指示器** — 自动跟随新字幕，向上滚动时显示浮动指示器
- **标签页设置** — 分为通用（外观、字幕、导出等）和集成（AI 供应商、Slack）两个标签页
- **主题支持** — 浅色、深色和自动主题，使用 CSS 自定义属性
- **自定义确认对话框** — 面板内确认框替代浏览器原生弹窗
- **工具提示** — 所有头部操作按钮的上下文提示
- **Toast 通知** — 主题感知的成功通知，带图标

## 技术栈

- **React 19** — 使用 Hooks 和 Context API 的现代 React
- **Vite 6** — 快速的构建工具和开发服务器
- **Chrome Extension Manifest V3** — 最新的扩展平台
- **react-markdown + remark-gfm** — AI 响应的 Markdown 渲染
- **CSS 自定义属性** — 主题和动态样式

## 项目结构

```
meet-live-captions/
├── public/
│   ├── manifest.json              # 扩展清单文件（Manifest V3）
│   ├── background.js              # Service Worker — 消息路由和存储
│   ├── content.js                 # 内容脚本 — DOM 字幕提取
│   └── icons/                     # 扩展图标
├── src/
│   ├── index.jsx                  # React 入口点
│   ├── App.jsx                    # 根组件 — 视图路由与全局状态
│   ├── containers/                # 视图屏幕（有状态，编排子组件）
│   │   ├── AIChat.jsx             #   AI 聊天视图（流式传输与操作）
│   │   ├── CaptionsList.jsx       #   可滚动字幕列表
│   │   ├── Settings.jsx           #   设置外壳（头部 + 标签页）
│   │   └── settings/
│   │       ├── SettingsGeneral.jsx     # 通用标签页内容
│   │       └── SettingsIntegrations.jsx # 集成标签页内容
│   ├── components/                # 可复用展示组件
│   │   ├── CaptionMessage.jsx     #   单条字幕气泡
│   │   ├── ConfirmDialog.jsx      #   确认对话框覆盖层
│   │   ├── EmptyState.jsx         #   空状态/等待状态
│   │   ├── Footer.jsx             #   字幕计数 + 持续时间计时器
│   │   ├── Header.jsx             #   品牌 + 操作按钮
│   │   ├── ScrollToBottom.jsx     #   浮动滚动指示器
│   │   ├── SearchBar.jsx          #   防抖搜索输入框
│   │   ├── SpeakerAvatar.jsx      #   带颜色回退的头像
│   │   ├── Toast.jsx              #   Toast 通知
│   │   ├── Tooltip.jsx            #   悬浮工具提示
│   │   └── settings/              #   设置原始组件
│   │       ├── SecretInput.jsx    #     密码输入框 + 眼睛切换
│   │       ├── SettingsRow.jsx    #     标签 + 控件行
│   │       ├── SettingsSection.jsx #    区块包装器
│   │       └── Toggle.jsx         #     开关切换
│   ├── hooks/
│   │   ├── useAIChat.js           # AI 聊天状态与流式逻辑
│   │   ├── useCaptions.js         # 字幕状态 + chrome.runtime 消息传递
│   │   ├── useConfirm.js          # 确认对话框状态
│   │   ├── useSettings.jsx        # 设置上下文，使用 chrome.storage.local
│   │   └── useToast.js            # Toast 通知 Hook
│   ├── services/
│   │   └── ai.js                  # 统一 AI API 服务（OpenAI/Claude/DeepSeek/Gemini）
│   ├── utils/
│   │   ├── format.js              # 时间格式化工具
│   │   └── export.js              # 会议记录导出与导入（TXT/SRT/JSON）
│   ├── constants/
│   │   └── index.js               # 共享常量、AI 供应商配置、默认值
│   └── styles/
│       └── index.css              # 所有样式，使用 CSS 自定义属性
├── sidepanel.html                 # Vite 入口 HTML
├── package.json
├── vite.config.js
├── .gitignore
├── LICENSE
├── README.md
└── README.zh.md
```

## 架构

扩展使用三部分架构来捕获和显示字幕：

### 层级

1. **内容脚本** (`public/content.js`)
   - 在 `meet.google.com` 页面上运行
   - 使用 `MutationObserver` 检测字幕区域变化
   - 使用多种解析策略提取发言者姓名和文本
   - 从 Meet DOM 检测发言者头像
   - 监控会议结束状态（URL 变化、"您已离开会议"文本、标签关闭）
   - 向后台 Worker 发送字幕和会议生命周期事件

2. **后台 Service Worker** (`public/background.js`)
   - 在内容脚本和侧边栏之间中继消息
   - 使用复合 ID 在 `chrome.storage.session` 中持久化字幕
   - 跟踪会议状态（开始、结束、标签生命周期）
   - 将会议元数据与字幕数据分开管理

3. **侧边栏** (`src/` — React 应用)
   - **容器（Containers）** 编排视图级别的状态（AIChat、CaptionsList、Settings）
   - **组件（Components）** 是可复用的展示型构建块
   - **Hooks** 管理领域逻辑（字幕、设置、AI 聊天、确认、通知）
   - **Services** 处理外部 API 调用（AI 供应商）
   - 使用 React 19 和 Vite 6 构建

### 消息流

```
内容脚本  ──CAPTION_UPDATE──▶  后台  ──CAPTION_UPDATE_RELAY──▶  侧边栏
          ──MEETING_STARTED──▶         ──MEETING_CHANGED──▶
          ──MEETING_ENDED──▶           ──MEETING_ENDED──▶
侧边栏    ──GET_CAPTIONS────▶  后台  （返回存储的字幕）
          ──CLEAR_CAPTIONS──▶
          ──RESTORE_CAPTIONS▶         （用导入的数据替换存储的字幕）
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

这将在 `http://localhost:5173/` 启动 Vite 开发服务器。您还可以预览生产构建：

```bash
npm run build && npm run preview
```

注意：Chrome 扩展 API（`chrome.*`）仅在作为扩展加载时可用。开发/预览服务器适用于 UI 开发。

## 使用方法

1. 加入 Google Meet 通话
2. 点击 Chrome 工具栏中的扩展图标以打开侧边栏
3. 在 Google Meet 中打开**实时字幕**（点击 `CC` 按钮或按 `c`）
4. 字幕将实时显示在侧边栏中

### 工具栏操作

| 按钮 | 操作 |
|------|------|
| AI 助手 | 打开 AI 聊天面板 |
| 设置 | 打开设置面板 |
| 上传 | 上传之前下载的会议记录以恢复会议历史 |
| 眼睛 | 切换 Meet 原生字幕覆盖层的可见性 |
| 下载 | 以配置的格式（TXT/SRT/JSON）导出会议记录 |
| 垃圾桶 | 清除所有捕获的字幕 |

### AI 助手

1. 前往 **设置 → 集成** 并为至少一个供应商添加 API 密钥
2. 点击头部的 **AI 助手** 按钮
3. 从工具栏下拉菜单中选择供应商和模型
4. 切换 **会议上下文** 以在提示中包含近期字幕
5. 使用快速提示或输入自定义问题
6. 复制回复或直接发送到 Slack

## 设置

设置分为两个标签页：

### 通用标签页

#### 外观

| 设置 | 选项 | 说明 |
|------|------|------|
| 主题 | 自动、浅色、深色 | 侧边栏的颜色主题 |
| 字体大小 | 12px – 16px | 字幕的基础字体大小 |
| 紧凑模式 | 开/关 | 减少间距以实现更紧凑的显示 |

#### 字幕行为

| 设置 | 选项 | 说明 |
|------|------|------|
| 自动隐藏 Meet 字幕 | 开/关 | 自动隐藏 Meet 的原生字幕覆盖层 |
| 自动滚动到底部 | 开/关 | 自动滚动到最新字幕 |
| 合并相同发言者 | 开/关 | 合并来自同一发言者的连续字幕 |

#### 导出

| 设置 | 选项 | 说明 |
|------|------|------|
| 格式 | TXT、SRT、JSON | 默认导出格式 |
| 包含时间戳 | 开/关 | 在导出的会议记录中包含时间戳 |
| 包含发言者 | 开/关 | 在导出的会议记录中包含发言者姓名 |

#### 通知

| 设置 | 选项 | 说明 |
|------|------|------|
| 声音通知 | 开/关 | 新字幕到达时播放声音 |
| 徽章计数 | 开/关 | 在扩展图标上显示字幕计数徽章 |

#### 存储

| 设置 | 选项 | 说明 |
|------|------|------|
| 自动保存会议记录 | 开/关 | 定期自动保存会议记录 |
| 最大字幕数 | 无限制、100、500、1,000、5,000 | 内存中保留的最大字幕数量 |
| 会议结束时清除 | 开/关 | 会议结束时自动清除字幕 |

#### 无障碍

| 设置 | 选项 | 说明 |
|------|------|------|
| 高对比度 | 开/关 | 增加对比度以提高可见性 |
| 减少动画 | 开/关 | 为减少动画偏好禁用动画 |

### 集成标签页

#### AI 供应商

| 供应商 | 密钥格式 |
|--------|----------|
| OpenAI | `sk-...` |
| Claude (Anthropic) | `sk-ant-...` |
| DeepSeek | `sk-...` |
| Gemini (Google) | `AI...` |

#### Slack

| 设置 | 说明 |
|------|------|
| Webhook URL | 用于发送 AI 回复的 Slack Incoming Webhook URL |
| 频道名称 | 目标频道的显示标签（例如 `#general`） |

## 权限

| 权限 | 原因 |
|------|------|
| `sidePanel` | 显示字幕会议记录面板 |
| `storage` | 在会话存储中持久化字幕，在本地存储中保存设置 |
| `activeTab` | 访问活动标签页以打开侧边栏 |
| `tabs` | 检测 Google Meet 标签页并中继消息 |
| `host_permissions: meet.google.com` | 在 Meet 页面上运行内容脚本 |
| `host_permissions: api.openai.com` | 获取模型并流式传输 AI 聊天（OpenAI） |
| `host_permissions: api.anthropic.com` | 获取模型并流式传输 AI 聊天（Claude） |
| `host_permissions: api.deepseek.com` | 获取模型并流式传输 AI 聊天（DeepSeek） |
| `host_permissions: googleapis.com` | 获取模型并流式传输 AI 聊天（Gemini） |
| `host_permissions: hooks.slack.com` | 将 AI 回复发送到 Slack 频道 |

## 浏览器支持

- Google Chrome 116+（需要 Side Panel API 和 Manifest V3）
- 支持 Side Panel 的基于 Chromium 的浏览器（Edge、Brave 等）

## 许可证

本项目采用 [MIT 许可证](LICENSE) 授权。
