# Google Meet - Live Captions

[English](./README.md) | [中文](./README.zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4.svg)](public/manifest.json)
[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react)](package.json)
[![Vite 6](https://img.shields.io/badge/Vite-6-646CFF.svg?logo=vite)](package.json)

A Chrome extension that captures Google Meet live captions in a side panel. Review, search, download, and re-upload transcripts in real-time — with a built-in AI assistant for meeting insights.

## Features

- **Real-time captions** — Captures live captions with multi-speaker support, color-coded avatars, and smart deduplication
- **Search & export** — Full-text search, download transcripts (TXT/SRT/JSON), and re-upload previous transcripts
- **AI assistant** — Chat with OpenAI, Claude, DeepSeek, or Gemini about your meeting; stream responses with markdown rendering
- **Slack integration** — Send AI responses directly to a Slack channel via webhook
- **Google sign-in** — Authenticate with Google, with a 30-day session and user avatar display
- **Customisable settings** — Three-tab settings (Account, General, Integrations) with theme, font, export, and notification options

## Tech Stack

- React 19 + Vite 6
- Chrome Extension Manifest V3
- react-markdown + remark-gfm
- CSS Custom Properties for theming

## Architecture

```
Content Script (content.js)  ──▶  Background Service Worker (background.js)  ──▶  Side Panel (React)
        DOM caption extraction           Message routing & storage                    UI & state management
```

## Project Structure

```
meet-live-captions/
├── public/
│   ├── manifest.json      # Chrome extension manifest (v3)
│   ├── content.js         # Injected into meet.google.com — extracts captions from the DOM
│   ├── background.js      # Service worker — message routing & storage
│   └── icons/             # Extension icons
├── sidepanel.html          # Side panel entry point
├── src/
│   ├── App.jsx             # Root component
│   ├── index.jsx           # React entry point
│   ├── components/         # Presentational UI components
│   ├── containers/         # Stateful views (captions list, AI chat, settings)
│   ├── hooks/               # Custom hooks (captions, AI chat, auth, settings, toast)
│   ├── services/            # AI provider API clients
│   ├── constants/           # Shared constants (message types, providers, defaults)
│   ├── utils/                # Export & formatting helpers
│   └── styles/               # Global CSS
└── vite.config.js          # Build configuration (React plugin, extension output)
```

## Getting Started

### Prerequisites

- Node.js 18+
- Google Chrome 116+ (or Chromium-based browser with Side Panel API)

### Installation

```bash
git clone https://github.com/encoreshao/meet-live-captions.git
cd meet-live-captions
npm install
```

Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` and add your Google OAuth client ID (create one at [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) as a **Chrome Extension** type):

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Build and load:

```bash
npm run build
```

Then go to `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the `dist/` folder.

### Development

```bash
npm run dev       # Dev server at http://localhost:5173/
npm run preview   # Preview production build
```

> Chrome extension APIs (`chrome.*`) are only available when loaded as an extension.

## Usage

1. Join a Google Meet call
2. Click the extension icon to open the side panel
3. Turn on **live captions** in Meet (click `CC` or press `c`)
4. Captions appear in the side panel in real-time

### AI Assistant

Add an API key in **Settings → Integrations**, then open the AI chat to ask questions about your meeting — with optional meeting context injection.

## Permissions

| Permission | Reason |
|-----------|--------|
| `sidePanel` | Display the caption panel |
| `storage` | Persist captions and settings |
| `activeTab` / `tabs` | Access Meet tabs and open side panel |
| `identity` | Google OAuth2 sign-in |
| `host_permissions` | Meet page access, AI provider APIs, Slack webhooks |

## Contributing

Contributions are welcome. To propose a change:

1. Fork the repository and create a feature branch
2. Make your changes and verify them with `npm run build` (and `npm run dev` for manual testing in Meet)
3. Open a pull request describing the change and why it's needed

Please keep pull requests focused — one feature or fix per PR — and avoid unrelated formatting changes.

## Support

- **Bugs & feature requests**: [open an issue](https://github.com/encoreshao/meet-live-captions/issues)
- **Questions**: use [GitHub Discussions](https://github.com/encoreshao/meet-live-captions/discussions) or open an issue

## License

[MIT License](LICENSE)
