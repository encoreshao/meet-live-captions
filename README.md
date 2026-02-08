# Meet - Live Captions

A Chrome extension that captures Google Meet live captions in a side panel. Review and download full conversation transcripts in real-time.

## Features

- **Real-time caption capture** — Automatically detects and captures live captions from Google Meet
- **Multi-speaker support** — Identifies and color-codes different speakers with avatar initials
- **In-place updates** — Captions update live as speakers talk, no duplicate entries
- **Search** — Filter through the conversation with instant search
- **Download transcript** — Export the full conversation as a `.txt` file with timestamps and speaker labels
- **Hide Meet captions** — Toggle the native Meet caption overlay while still capturing in the side panel
- **Auto-scroll** — Follows new captions with a "new messages" indicator when scrolled up
- **Session persistence** — Captions survive side panel close/reopen and page refresh within the same meeting

## Screenshots

| Empty State | Capturing Captions |
|:-----------:|:------------------:|
| *Side panel waiting for captions* | *Live transcript with multiple speakers* |

## Installation

### From source (Developer mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/encoreshao/meet-live-captions.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the `meet-live-captions` folder
5. Navigate to [Google Meet](https://meet.google.com) and click the extension icon to open the side panel

## Usage

1. Join a Google Meet call
2. Click the extension icon in the Chrome toolbar to open the side panel
3. Turn on **live captions** in Google Meet (click the `CC` button or press `c`)
4. Captions will appear in the side panel in real-time

### Toolbar actions

| Button | Action |
|--------|--------|
| 👁 Eye | Toggle visibility of Meet's native caption overlay |
| ⬇ Download | Export transcript as a `.txt` file |
| 🗑 Trash | Clear all captured captions |

## Architecture

```
meet-live-captions/
├── manifest.json        # Extension manifest (Manifest V3)
├── background.js        # Service worker — message routing & session storage
├── content.js           # Content script — DOM caption extraction on meet.google.com
├── sidepanel.html       # Side panel markup
├── sidepanel.js         # Side panel logic — rendering, search, download
├── sidepanel.css        # Side panel styles — flat design with design tokens
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### How it works

1. **Content script** (`content.js`) runs on `meet.google.com` pages. It uses a `MutationObserver` to detect caption region changes, then extracts speaker names and text using multiple parsing strategies (font-size markers, DOM structure, fallback).

2. **Background service worker** (`background.js`) relays messages between the content script and side panel. It persists captions in `chrome.storage.session` so they survive panel close/reopen.

3. **Side panel** (`sidepanel.js` + `sidepanel.html`) renders captions in a chat-like UI with speaker avatars, timestamps, search, and transcript download.

### Message flow

```
Content Script  ──CAPTION_UPDATE──▶  Background  ──CAPTION_UPDATE──▶  Side Panel
                ──MEETING_STARTED──▶             ──MEETING_CHANGED──▶
Side Panel      ──GET_CAPTIONS────▶  Background  (responds with stored captions)
                ──CLEAR_CAPTIONS──▶
                ──TOGGLE_CAPTIONS─▶              ──TOGGLE_CAPTIONS──▶  Content Script
```

## Permissions

| Permission | Reason |
|-----------|--------|
| `sidePanel` | Display the caption transcript panel |
| `storage` | Persist captions in session storage |
| `activeTab` | Access the active tab to open the side panel |
| `tabs` | Detect Google Meet tabs and relay messages |
| `host_permissions: meet.google.com` | Run the content script on Meet pages |


## Browser support

- Google Chrome 116+ (requires Side Panel API and Manifest V3)
- Chromium-based browsers with Side Panel support (Edge, Brave, etc.)

## License

This project is licensed under the [MIT License](LICENSE).
