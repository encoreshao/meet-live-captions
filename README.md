# Google Meet - Live Captions

[English](./README.md) | [中文](./README.zh.md)

A Chrome extension that captures Google Meet live captions in a side panel. Review, search, download, and re-upload transcripts in real-time — with a built-in AI assistant for meeting insights.

## Features

### Caption Capture
- **Real-time caption capture** — Automatically detects and captures live captions from Google Meet with multi-speaker support
- **Speaker avatar detection** — Extracts speaker avatars from Meet DOM and displays them alongside captions
- **Color-coded speaker identification** — Each speaker gets a unique color and initials badge for easy visual distinction
- **In-place caption updates** — Captions update live as speakers talk, with smart continuation detection to preserve history
- **Caption persistence** — Captions survive side panel close/reopen, page refresh, and URL changes until explicitly cleared
- **Meeting end detection** — Multi-layer detection (URL, DOM, tab close) automatically stops the timer when you leave

### Search & Export
- **Full-text search** — Filter through the conversation with instant debounced search
- **Download transcript** — Export the full conversation in TXT, SRT, or JSON formats with customizable options
- **Upload transcript** — Re-upload a previously downloaded transcript file (JSON, TXT, or SRT) to restore the full meeting history in the viewer
- **Hide Meet native caption overlay** — Toggle the native Meet caption overlay while still capturing in the side panel

### AI Assistant
- **Built-in AI chat** — ChatGPT-style interface to ask questions about your meeting
- **Multi-provider support** — OpenAI, Claude, DeepSeek, and Gemini with real-time model fetching
- **Streaming responses** — Responses stream in real-time with markdown rendering (headings, lists, code blocks, tables)
- **Meeting context injection** — Optionally include recent captions as context for more relevant AI responses
- **Quick prompts** — One-click suggestions like "Summarize the meeting" or "List action items" that auto-send
- **Copy & Slack** — Copy AI responses to clipboard or send directly to a Slack channel

### UI & Settings
- **Auto-scroll with indicator** — Automatically follows new captions with a floating indicator when scrolled up
- **Tabbed settings** — Organized into General (appearance, captions, export, etc.) and Integrations (AI providers, Slack)
- **Theme support** — Light, dark, and auto themes with CSS custom properties
- **Custom confirmation dialogs** — In-panel confirmations replace native browser popups
- **Tooltips** — Contextual tooltips on all header actions
- **Toast notifications** — Theme-aware success notifications with icons

## Tech Stack

- **React 19** — Modern React with hooks and context API
- **Vite 6** — Fast build tool and dev server
- **Chrome Extension Manifest V3** — Latest extension platform
- **react-markdown + remark-gfm** — Markdown rendering for AI responses
- **CSS Custom Properties** — Theming and dynamic styling

## Project Structure

```
meet-live-captions/
├── public/
│   ├── manifest.json              # Extension manifest (Manifest V3)
│   ├── background.js              # Service worker — message routing & storage
│   ├── content.js                 # Content script — DOM caption extraction
│   └── icons/                     # Extension icons
├── src/
│   ├── index.jsx                  # React entry point
│   ├── App.jsx                    # Root — view routing & global state
│   ├── containers/                # View screens (stateful, orchestrate children)
│   │   ├── AIChat.jsx             #   AI chat view with streaming & actions
│   │   ├── CaptionsList.jsx       #   Scrollable captions feed
│   │   ├── Settings.jsx           #   Settings shell (header + tabs)
│   │   └── settings/
│   │       ├── SettingsGeneral.jsx     # General tab content
│   │       └── SettingsIntegrations.jsx # Integrations tab content
│   ├── components/                # Reusable presentational components
│   │   ├── CaptionMessage.jsx     #   Single caption bubble
│   │   ├── ConfirmDialog.jsx      #   Confirmation overlay
│   │   ├── EmptyState.jsx         #   Empty/waiting state
│   │   ├── Footer.jsx             #   Caption count + duration timer
│   │   ├── Header.jsx             #   Brand + action buttons
│   │   ├── ScrollToBottom.jsx     #   Floating scroll indicator
│   │   ├── SearchBar.jsx          #   Debounced search input
│   │   ├── SpeakerAvatar.jsx      #   Avatar with color fallback
│   │   ├── Toast.jsx              #   Toast notifications
│   │   ├── Tooltip.jsx            #   Hover tooltip
│   │   └── settings/              #   Settings primitives
│   │       ├── SecretInput.jsx    #     Password input + eye toggle
│   │       ├── SettingsRow.jsx    #     Label + control row
│   │       ├── SettingsSection.jsx #    Section wrapper
│   │       └── Toggle.jsx         #     Toggle switch
│   ├── hooks/
│   │   ├── useAIChat.js           # AI chat state & streaming logic
│   │   ├── useCaptions.js         # Captions state + chrome.runtime messaging
│   │   ├── useConfirm.js          # Confirmation dialog state
│   │   ├── useSettings.jsx        # Settings context with chrome.storage.local
│   │   └── useToast.js            # Toast notification hook
│   ├── services/
│   │   └── ai.js                  # Unified AI API service (OpenAI/Claude/DeepSeek/Gemini)
│   ├── utils/
│   │   ├── format.js              # Time formatting utilities
│   │   └── export.js              # Transcript export & import (TXT/SRT/JSON)
│   ├── constants/
│   │   └── index.js               # Shared constants, AI provider configs, defaults
│   └── styles/
│       └── index.css              # All styles with CSS custom properties
├── sidepanel.html                 # Vite entry HTML
├── package.json
├── vite.config.js
├── .gitignore
├── LICENSE
├── README.md
└── README.zh.md
```

## Architecture

The extension uses a three-part architecture to capture and display captions:

### Layers

1. **Content Script** (`public/content.js`)
   - Runs on `meet.google.com` pages
   - Uses `MutationObserver` to detect caption region changes
   - Extracts speaker names and text using multiple parsing strategies
   - Detects speaker avatars from Meet DOM
   - Monitors meeting end state (URL changes, "You left" text, tab close)
   - Sends caption and meeting lifecycle events to the background worker

2. **Background Service Worker** (`public/background.js`)
   - Relays messages between content script and side panel
   - Persists captions with composite IDs in `chrome.storage.session`
   - Tracks meeting state (start, end, tab lifecycle)
   - Manages meeting metadata separately from caption data

3. **Side Panel** (`src/` — React application)
   - **Containers** orchestrate view-level state (AIChat, CaptionsList, Settings)
   - **Components** are reusable presentational building blocks
   - **Hooks** manage domain logic (captions, settings, AI chat, confirmations, toasts)
   - **Services** handle external API calls (AI providers)
   - Built with React 19 and Vite 6

### Message Flow

```
Content Script  ──CAPTION_UPDATE──▶  Background  ──CAPTION_UPDATE_RELAY──▶  Side Panel
                ──MEETING_STARTED──▶             ──MEETING_CHANGED──▶
                ──MEETING_ENDED──▶               ──MEETING_ENDED──▶
Side Panel      ──GET_CAPTIONS────▶  Background  (responds with stored captions)
                ──CLEAR_CAPTIONS──▶
                ──RESTORE_CAPTIONS▶              (replaces stored captions with imported data)
                ──TOGGLE_CAPTIONS─▶              ──TOGGLE_CAPTIONS──▶  Content Script
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)
- Google Chrome 116+ or Chromium-based browser with Side Panel API support

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/encoreshao/meet-live-captions.git
   cd meet-live-captions
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```
   This outputs the built extension to the `dist/` directory.

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in the top-right corner)
   - Click **Load unpacked**
   - Select the `dist/` folder from the project directory

### Development

For development with hot module replacement:

```bash
npm run dev
```

This starts the Vite dev server at `http://localhost:5173/`. You can also preview the production build:

```bash
npm run build && npm run preview
```

Note: Chrome extension APIs (`chrome.*`) are only available when loaded as an extension. The dev/preview servers are useful for UI development.

## Usage

1. Join a Google Meet call
2. Click the extension icon in the Chrome toolbar to open the side panel
3. Turn on **live captions** in Google Meet (click the `CC` button or press `c`)
4. Captions will appear in the side panel in real-time

### Toolbar Actions

| Button | Action |
|--------|--------|
| AI Assistant | Open the AI chat panel |
| Settings | Open settings panel |
| Upload | Upload a previously downloaded transcript to restore meeting history |
| Eye | Toggle visibility of Meet's native caption overlay |
| Download | Export transcript in the configured format (TXT/SRT/JSON) |
| Trash | Clear all captured captions |

### AI Assistant

1. Go to **Settings → Integrations** and add an API key for at least one provider
2. Click the **AI Assistant** button in the header
3. Select a provider and model from the toolbar dropdowns
4. Toggle **Meeting context** to include recent captions in your prompts
5. Use quick prompts or type your own questions
6. Copy responses or send them directly to Slack

## Settings

Settings are organized into two tabs:

### General Tab

#### Appearance

| Setting | Options | Description |
|---------|---------|-------------|
| Theme | Auto, Light, Dark | Color theme for the side panel |
| Font Size | 12px – 16px | Base font size for captions |
| Compact Mode | On/Off | Reduce spacing for more compact display |

#### Caption Behavior

| Setting | Options | Description |
|---------|---------|-------------|
| Auto-hide Meet Captions | On/Off | Automatically hide Meet's native caption overlay |
| Auto-scroll to Bottom | On/Off | Automatically scroll to newest captions |
| Merge Same Speaker | On/Off | Combine consecutive captions from the same speaker |

#### Export

| Setting | Options | Description |
|---------|---------|-------------|
| Format | TXT, SRT, JSON | Default export format |
| Include Timestamps | On/Off | Include timestamps in exported transcript |
| Include Speakers | On/Off | Include speaker names in exported transcript |

#### Notifications

| Setting | Options | Description |
|---------|---------|-------------|
| Sound Notifications | On/Off | Play sound when new captions arrive |
| Badge Count | On/Off | Show caption count badge on extension icon |

#### Storage

| Setting | Options | Description |
|---------|---------|-------------|
| Auto-save Transcripts | On/Off | Automatically save transcripts periodically |
| Max Captions | Unlimited, 100, 500, 1K, 5K | Maximum captions to keep in memory |
| Clear on Meeting End | On/Off | Automatically clear captions when meeting ends |

#### Accessibility

| Setting | Options | Description |
|---------|---------|-------------|
| High Contrast | On/Off | Increase contrast for better visibility |
| Reduced Motion | On/Off | Disable animations for reduced motion preference |

### Integrations Tab

#### AI Providers

| Provider | Key Format |
|----------|------------|
| OpenAI | `sk-...` |
| Claude (Anthropic) | `sk-ant-...` |
| DeepSeek | `sk-...` |
| Gemini (Google) | `AI...` |

#### Slack

| Setting | Description |
|---------|-------------|
| Webhook URL | Slack Incoming Webhook URL for sending AI responses |
| Channel Name | Display label for the target channel (e.g. `#general`) |

## Permissions

| Permission | Reason |
|-----------|--------|
| `sidePanel` | Display the caption transcript panel |
| `storage` | Persist captions in session storage and settings in local storage |
| `activeTab` | Access the active tab to open the side panel |
| `tabs` | Detect Google Meet tabs and relay messages |
| `host_permissions: meet.google.com` | Run the content script on Meet pages |
| `host_permissions: api.openai.com` | Fetch models and stream AI chat (OpenAI) |
| `host_permissions: api.anthropic.com` | Fetch models and stream AI chat (Claude) |
| `host_permissions: api.deepseek.com` | Fetch models and stream AI chat (DeepSeek) |
| `host_permissions: googleapis.com` | Fetch models and stream AI chat (Gemini) |
| `host_permissions: hooks.slack.com` | Send AI responses to Slack channels |

## Browser Support

- Google Chrome 116+ (requires Side Panel API and Manifest V3)
- Chromium-based browsers with Side Panel support (Edge, Brave, etc.)

## License

This project is licensed under the [MIT License](LICENSE).
