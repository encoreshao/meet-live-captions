// Message types used between content script, background, and side panel
export const MESSAGE_TYPES = {
  CAPTION_UPDATE: "CAPTION_UPDATE",
  GET_CAPTIONS: "GET_CAPTIONS",
  CLEAR_CAPTIONS: "CLEAR_CAPTIONS",
  MEETING_STARTED: "MEETING_STARTED",
  MEETING_CHANGED: "MEETING_CHANGED",
  TOGGLE_MEET_CAPTIONS: "TOGGLE_MEET_CAPTIONS",
};

// Speaker avatar color palette
export const SPEAKER_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F97316",
  "#14B8A6", "#EF4444", "#6366F1", "#059669",
];

// Default settings (persisted in chrome.storage.local)
export const SETTINGS_DEFAULTS = {
  theme: "auto",
  fontSize: "14",
  compact: false,
  autoHide: false,
  autoScroll: true,
  mergeSpeaker: false,
  exportFormat: "txt",
  exportTimestamps: true,
  exportSpeakers: true,
  sound: false,
  badge: true,
  autoSave: false,
  maxCaptions: "0",
  clearOnEnd: false,
  highContrast: false,
  reducedMotion: false,
};
