# Google Meet - Live Captions

[English](./README.md) | [中文](./README.zh.md)

A Chrome extension that captures Google Meet live captions in a side panel. Review and download full conversation transcripts in real-time.

## Features

- **Real-time caption capture** — Automatically detects and captures live captions from Google Meet with multi-speaker support
- **Speaker avatar detection** — Extracts speaker avatars from Meet DOM and displays them alongside captions
- **Color-coded speaker identification** — Each speaker gets a unique color and initials badge for easy visual distinction
- **In-place caption updates** — Captions update live as speakers talk, preventing duplicate entries
- **Full-text search** — Filter through the conversation with instant search functionality
- **Download transcript** — Export the full conversation in multiple formats (TXT, SRT, JSON) with customizable options
- **Hide Meet native caption overlay** — Toggle the native Meet caption overlay while still capturing in the side panel
- **Auto-scroll with new messages indicator** — Automatically follows new captions with a visual indicator when scrolled up
- **Settings panel** — Comprehensive settings for theme/dark mode, font size, compact mode, export options, and more
- **Session persistence** — Captions survive side panel close/reopen and page refresh within the same meeting

## Tech Stack

- **React 19** — Modern React with hooks and context API
- **Vite 6** — Fast build tool and dev server
- **Chrome Extension Manifest V3** — Latest extension platform
- **CSS Custom Properties** — Theming and dynamic styling

## Project Structure

```
meet-live-captions/
├── public/
│   ├── manifest.json          # Extension manifest (Manifest V3)
│   ├── background.js          # Service worker — message routing & storage
│   ├── content.js             # Content script — DOM caption extraction
│   └── icons/                 # Extension icons
├── src/
│   ├── index.jsx              # React entry point
│   ├── App.jsx                # Main app — view switching
│   ├── constants/index.js     # Shared constants (colors, defaults, message types)
│   ├── utils/
│   │   ├── format.js          # Time formatting utilities
│   │   └── export.js          # Transcript export (TXT/SRT/JSON)
│   ├── hooks/
│   │   ├── useSettings.js     # Settings context with chrome.storage.local
│   │   ├── useCaptions.js     # Captions state + chrome.runtime messaging
│   │   └── useToast.js        # Toast notification hook
│   ├── components/
│   │   ├── Header.jsx         # Brand, actions, status
│   │   ├── SearchBar.jsx      # Search input with debounce
│   │   ├── CaptionsList.jsx   # Scrollable caption container
│   │   ├── CaptionMessage.jsx # Single caption entry
│   │   ├── SpeakerAvatar.jsx  # Avatar image with fallback
│   │   ├── EmptyState.jsx     # Empty/no-results state
│   │   ├── ScrollToBottom.jsx # New messages indicator
│   │   ├── Footer.jsx         # Stats bar
│   │   ├── Settings.jsx       # Full settings panel
│   │   └── Toast.jsx          # Toast notifications
│   └── styles/index.css       # All styles with CSS custom properties
├── sidepanel.html             # Vite entry HTML
├── package.json
├── vite.config.js
├── .gitignore
├── LICENSE
├── README.md
└── README.zh.md
```

## Architecture

The extension uses a three-part architecture to capture and display captions:

### Components

1. **Content Script** (`public/content.js`)
   - Runs on `meet.google.com` pages
   - Uses `MutationObserver` to detect caption region changes
   - Extracts speaker names and text using multiple parsing strategies (font-size markers, DOM structure, fallback)
   - Detects speaker avatars from Meet DOM
   - Sends caption updates to the background service worker

2. **Background Service Worker** (`public/background.js`)
   - Relays messages between content script and side panel
   - Persists captions in `chrome.storage.session` for session persistence
   - Manages meeting state and routing

3. **Side Panel** (`src/` - React application)
   - Renders captions in a chat-like UI
   - Displays speaker avatars, timestamps, and color-coded identification
   - Provides search, settings, and transcript download functionality
   - Built with React 19 and Vite 6

### Message Flow

```
Content Script  ──CAPTION_UPDATE──▶  Background  ──CAPTION_UPDATE──▶  Side Panel
                ──MEETING_STARTED──▶             ──MEETING_CHANGED──▶
Side Panel      ──GET_CAPTIONS────▶  Background  (responds with stored captions)
                ──CLEAR_CAPTIONS──▶
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

This starts the Vite dev server. Note that you'll still need to reload the extension in Chrome after making changes to see them reflected.

## Usage

1. Join a Google Meet call
2. Click the extension icon in the Chrome toolbar to open the side panel
3. Turn on **live captions** in Google Meet (click the `CC` button or press `c`)
4. Captions will appear in the side panel in real-time

### Toolbar Actions

| Button | Action |
|--------|--------|
| Eye | Toggle visibility of Meet's native caption overlay |
| Download | Export transcript in the configured format (TXT/SRT/JSON) |
| Trash | Clear all captured captions |
| Settings | Open settings panel |

## Settings

The extension provides comprehensive settings organized into categories:

### Appearance

| Setting | Options | Description |
|---------|---------|-------------|
| Theme | Auto, Light, Dark | Color theme for the side panel |
| Font Size | 12px, 13px, 14px, 15px, 16px | Base font size for captions |
| Compact Mode | On/Off | Reduce spacing for more compact display |

### Caption Behavior

| Setting | Options | Description |
|---------|---------|-------------|
| Auto-hide Meet Captions | On/Off | Automatically hide Meet's native caption overlay |
| Auto-scroll to Bottom | On/Off | Automatically scroll to newest captions |
| Merge Same Speaker | On/Off | Combine consecutive captions from the same speaker |

### Export

| Setting | Options | Description |
|---------|---------|-------------|
| Format | TXT, SRT, JSON | Default export format |
| Include Timestamps | On/Off | Include timestamps in exported transcript |
| Include Speakers | On/Off | Include speaker names in exported transcript |

### Notifications

| Setting | Options | Description |
|---------|---------|-------------|
| Sound Notifications | On/Off | Play sound when new captions arrive |
| Badge Count | On/Off | Show caption count badge on extension icon |

### Storage

| Setting | Options | Description |
|---------|---------|-------------|
| Auto-save Transcripts | On/Off | Automatically save transcripts periodically |
| Max Captions | Unlimited, 100, 500, 1,000, 5,000 | Maximum number of captions to keep in memory |
| Clear on Meeting End | On/Off | Automatically clear captions when meeting ends |

### Accessibility

| Setting | Options | Description |
|---------|---------|-------------|
| High Contrast | On/Off | Increase contrast for better visibility |
| Reduced Motion | On/Off | Disable animations for reduced motion preference |

## Permissions

| Permission | Reason |
|-----------|--------|
| `sidePanel` | Display the caption transcript panel |
| `storage` | Persist captions in session storage and settings in local storage |
| `activeTab` | Access the active tab to open the side panel |
| `tabs` | Detect Google Meet tabs and relay messages |
| `host_permissions: meet.google.com` | Run the content script on Meet pages |

## Browser Support

- Google Chrome 116+ (requires Side Panel API and Manifest V3)
- Chromium-based browsers with Side Panel support (Edge, Brave, etc.)

## License

This project is licensed under the [MIT License](LICENSE).
