// Side Panel Logic - Meet - Live Captions
//
// Uses captionId to update captions in place.
// Same captionId = same speaker turn = update existing DOM element.

(function () {
  "use strict";

  // ============================================
  // Settings Defaults
  // ============================================
  const SETTINGS_DEFAULTS = {
    // Appearance
    theme: "auto",
    fontSize: "14",
    compact: false,
    // Caption Behavior
    autoHide: false,
    autoScroll: true,
    mergeSpeaker: false,
    // Export
    exportFormat: "txt",
    exportTimestamps: true,
    exportSpeakers: true,
    // Notifications
    sound: false,
    badge: true,
    // Storage
    autoSave: false,
    maxCaptions: "0",
    clearOnEnd: false,
    // Accessibility
    highContrast: false,
    reducedMotion: false,
  };

  let settings = { ...SETTINGS_DEFAULTS };

  // ============================================
  // State
  // ============================================
  let captions = []; // Array of { speaker, text, timestamp, captionId, avatarUrl }
  let speakerColors = {};
  let speakerColorIndex = 0;
  let speakerAvatarUrls = {}; // { "Speaker Name": "https://..." }
  let isAutoScroll = true;
  let hideMeetCaptions = false;
  let searchQuery = "";
  let startTime = null;
  let durationInterval = null;
  let newMessageCount = 0;
  let meetingTitle = "";
  let meetingUrl = "";
  let settingsOpen = false;

  // ============================================
  // DOM Elements
  // ============================================
  const captionsContainer = document.getElementById("captions-container");
  const captionsList = document.getElementById("captions-list");
  const emptyState = document.getElementById("empty-state");
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");
  const searchInput = document.getElementById("search-input");
  const btnHideCaptions = document.getElementById("btn-hide-captions");
  const btnDownload = document.getElementById("btn-download");
  const btnClear = document.getElementById("btn-clear");
  const scrollBottomBtn = document.getElementById("scroll-bottom-btn");
  const newCountEl = document.getElementById("new-count");
  const captionCountEl = document.getElementById("caption-count");
  const durationEl = document.getElementById("duration");

  // Settings DOM
  const btnSettings = document.getElementById("btn-settings");
  const settingsPanel = document.getElementById("settings-panel");
  const btnSettingsBack = document.getElementById("btn-settings-back");
  const btnResetSettings = document.getElementById("btn-reset-settings");
  const searchBar = document.querySelector(".search-bar");

  // ============================================
  // Speaker Color Management
  // ============================================
  const SPEAKER_COLORS = [
    "#3B82F6", "#8B5CF6", "#EC4899", "#F97316",
    "#14B8A6", "#EF4444", "#6366F1", "#059669",
  ];

  function getSpeakerColor(speaker) {
    if (!speakerColors[speaker]) {
      speakerColors[speaker] = speakerColorIndex % SPEAKER_COLORS.length;
      speakerColorIndex++;
    }
    return speakerColors[speaker];
  }

  function getSpeakerInitial(speaker) {
    if (!speaker || speaker === "Unknown" || speaker === "Participant") return "?";
    return speaker.charAt(0).toUpperCase();
  }

  // ============================================
  // Time Formatting
  // ============================================
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  // ============================================
  // Render Caption Message
  // ============================================
  function createCaptionElement(caption) {
    const div = document.createElement("div");
    div.className = "caption-message";
    div.dataset.captionId = caption.captionId;
    div.dataset.speaker = caption.speaker;

    const colorIndex = getSpeakerColor(caption.speaker);
    const text = highlightSearch(escapeHtml(caption.text));
    const avatarUrl = caption.avatarUrl || speakerAvatarUrls[caption.speaker] || null;
    const avatarHtml = avatarUrl
      ? `<div class="speaker-avatar speaker-color-${colorIndex}"><img class="speaker-avatar-img" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(caption.speaker)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="speaker-avatar-fallback" style="display:none">${getSpeakerInitial(caption.speaker)}</span></div>`
      : `<div class="speaker-avatar speaker-color-${colorIndex}">${getSpeakerInitial(caption.speaker)}</div>`;

    div.innerHTML = `
      <div class="caption-header">
        ${avatarHtml}
        <span class="speaker-name">${escapeHtml(caption.speaker)}</span>
        <span class="caption-time">${formatTime(caption.timestamp)}</span>
      </div>
      <div class="caption-text">${text}</div>
    `;

    return div;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function highlightSearch(text) {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${escapeRegex(searchQuery)})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  }

  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // ============================================
  // Render All Captions (full re-render for search / init)
  // ============================================
  function renderCaptions() {
    captionsList.innerHTML = "";

    const filtered = searchQuery
      ? captions.filter(
          (c) =>
            c.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.speaker.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : captions;

    if (filtered.length === 0) {
      emptyState.classList.remove("hidden");
      if (searchQuery) {
        emptyState.querySelector(".empty-title").textContent = "No results";
        emptyState.querySelector(".empty-desc").innerHTML =
          `No captions match "<strong>${escapeHtml(searchQuery)}</strong>"`;
      } else {
        emptyState.querySelector(".empty-title").textContent = "No captions yet";
        emptyState.querySelector(".empty-desc").innerHTML =
          'Turn on live captions in Google Meet<br/><span class="empty-hint">Click CC button or press <kbd>c</kbd> in Meet</span>';
      }
    } else {
      emptyState.classList.add("hidden");
      const fragment = document.createDocumentFragment();
      filtered.forEach((caption) => {
        fragment.appendChild(createCaptionElement(caption));
      });
      captionsList.appendChild(fragment);
    }

    updateStats();
    if (isAutoScroll) scrollToBottom();
  }

  // ============================================
  // Add or Update Caption (using captionId)
  // ============================================
  function addOrUpdateCaption(captionData) {
    if (!startTime) {
      startTime = Date.now();
      startDurationTimer();
    }

    statusDot.classList.add("active");
    statusText.textContent = "Capturing captions...";

    // Track avatar URL for this speaker (persist across updates)
    if (captionData.avatarUrl) {
      speakerAvatarUrls[captionData.speaker] = captionData.avatarUrl;
    }

    const captionId = captionData.captionId;

    // Try to find existing caption with same captionId
    const existingIdx = captions.findIndex(c => c.captionId === captionId);

    if (existingIdx >= 0) {
      // ---- UPDATE existing caption in place ----
      captions[existingIdx].text = captionData.text;
      captions[existingIdx].timestamp = captionData.timestamp;
      if (captionData.avatarUrl) {
        captions[existingIdx].avatarUrl = captionData.avatarUrl;
      }

      // Update the DOM element directly (no re-render)
      const msgEl = captionsList.querySelector(`[data-caption-id="${captionId}"]`);
      if (msgEl) {
        const textEl = msgEl.querySelector('.caption-text');
        if (textEl) {
          textEl.innerHTML = highlightSearch(escapeHtml(captionData.text));
        }

        // Update avatar if we now have one and it's currently showing initials
        if (captionData.avatarUrl) {
          updateAvatarElement(msgEl, captionData.avatarUrl, captionData.speaker);
        }
      }
    } else {
      // ---- ADD new caption ----
      captions.push(captionData);

      // Enforce max captions limit
      const maxCaptions = parseInt(settings.maxCaptions) || 0;
      if (maxCaptions > 0 && captions.length > maxCaptions) {
        const excess = captions.length - maxCaptions;
        captions.splice(0, excess);
        // Remove oldest DOM elements
        for (let i = 0; i < excess; i++) {
          const first = captionsList.firstElementChild;
          if (first) first.remove();
        }
      }

      emptyState.classList.add("hidden");

      const el = createCaptionElement(captionData);
      captionsList.appendChild(el);

      if (!isAutoScroll) {
        newMessageCount++;
        if (settings.badge) showScrollButton();
      }
    }

    updateStats();
    if (isAutoScroll) scrollToBottom();
  }

  // Update an existing avatar element from initials to an image
  function updateAvatarElement(msgEl, avatarUrl, speaker) {
    const avatarDiv = msgEl.querySelector('.speaker-avatar');
    if (!avatarDiv) return;

    // Already has an image
    if (avatarDiv.querySelector('.speaker-avatar-img')) return;

    const colorIndex = getSpeakerColor(speaker);
    avatarDiv.innerHTML = `<img class="speaker-avatar-img" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(speaker)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="speaker-avatar-fallback" style="display:none">${getSpeakerInitial(speaker)}</span>`;
  }

  // ============================================
  // Scroll Management
  // ============================================
  function scrollToBottom() {
    captionsContainer.scrollTop = captionsContainer.scrollHeight;
    newMessageCount = 0;
    hideScrollButton();
  }

  function showScrollButton() {
    scrollBottomBtn.style.display = "flex";
    newCountEl.textContent =
      newMessageCount === 1 ? "1 new message" : `${newMessageCount} new messages`;
  }

  function hideScrollButton() {
    scrollBottomBtn.style.display = "none";
  }

  captionsContainer.addEventListener("scroll", () => {
    const { scrollTop, scrollHeight, clientHeight } = captionsContainer;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 60;
    if (isNearBottom) {
      isAutoScroll = true;
      newMessageCount = 0;
      hideScrollButton();
    } else {
      isAutoScroll = false;
    }
  });

  scrollBottomBtn.addEventListener("click", () => {
    isAutoScroll = true;
    scrollToBottom();
  });

  // ============================================
  // Stats
  // ============================================
  function updateStats() {
    const count = captions.length;
    captionCountEl.textContent = count === 1 ? "1 message" : `${count} messages`;
  }

  function startDurationTimer() {
    if (durationInterval) return;
    durationInterval = setInterval(() => {
      if (startTime) {
        durationEl.textContent = formatDuration(Date.now() - startTime);
      }
    }, 1000);
  }

  // ============================================
  // Download Transcript
  // ============================================
  function downloadTranscript() {
    if (captions.length === 0) {
      showToast("No captions to download");
      return;
    }

    const format = settings.exportFormat;
    const includeTimestamps = settings.exportTimestamps;
    const includeSpeakers = settings.exportSpeakers;

    let content, mimeType, extension;

    if (format === "json") {
      // JSON export
      const exportData = {
        meetingTitle: meetingTitle || "Google Meet",
        meetingUrl: meetingUrl || "",
        date: new Date().toISOString(),
        duration: startTime ? formatDuration(Date.now() - startTime) : null,
        participants: [...new Set(captions.map(c => c.speaker))],
        captions: captions.map(c => {
          const entry = { text: c.text };
          if (includeSpeakers) entry.speaker = c.speaker;
          if (includeTimestamps) entry.timestamp = c.timestamp;
          return entry;
        }),
      };
      content = JSON.stringify(exportData, null, 2);
      mimeType = "application/json;charset=utf-8";
      extension = "json";
    } else if (format === "srt") {
      // SRT subtitle export
      let srt = "";
      captions.forEach((caption, i) => {
        const startMs = caption.timestamp - (captions[0]?.timestamp || caption.timestamp);
        const endMs = startMs + 3000; // default 3s duration
        srt += `${i + 1}\n`;
        srt += `${formatSrtTime(startMs)} --> ${formatSrtTime(endMs)}\n`;
        if (includeSpeakers) srt += `${caption.speaker}: `;
        srt += `${caption.text}\n\n`;
      });
      content = srt;
      mimeType = "text/plain;charset=utf-8";
      extension = "srt";
    } else {
      // TXT export (default)
      const participants = [...new Set(captions.map(c => c.speaker))];
      let text = "GOOGLE MEET TRANSCRIPT\n";
      text += "=".repeat(50) + "\n";
      if (meetingTitle) text += `Title: ${meetingTitle}\n`;
      if (meetingUrl) text += `Meeting: ${meetingUrl}\n`;
      text += `Date: ${new Date().toLocaleDateString()}\n`;
      if (startTime) text += `Duration: ${formatDuration(Date.now() - startTime)}\n`;
      text += `Messages: ${captions.length}\n`;
      if (includeSpeakers) text += `Participants (${participants.length}): ${participants.join(", ")}\n`;
      text += "=".repeat(50) + "\n\n";

      let lastSpeaker = "";
      captions.forEach((caption) => {
        const time = formatTime(caption.timestamp);
        if (includeSpeakers && caption.speaker !== lastSpeaker) {
          text += includeTimestamps ? `\n[${time}] ${caption.speaker}:\n` : `\n${caption.speaker}:\n`;
          lastSpeaker = caption.speaker;
        } else if (!includeSpeakers && includeTimestamps) {
          text += `[${time}] `;
        }
        text += `  ${caption.text}\n`;
      });
      content = text;
      mimeType = "text/plain;charset=utf-8";
      extension = "txt";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meet-transcript-${new Date().toISOString().slice(0, 10)}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);

    showToast("Transcript downloaded");
  }

  function formatSrtTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const millis = ms % 1000;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
  }

  // ============================================
  // Clear Captions
  // ============================================
  function clearCaptions() {
    if (captions.length === 0) return;
    if (!confirm("Clear all captured captions? This cannot be undone.")) return;

    captions = [];
    speakerColors = {};
    speakerColorIndex = 0;
    speakerAvatarUrls = {};
    startTime = null;
    newMessageCount = 0;

    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }

    durationEl.textContent = "0:00";
    renderCaptions();

    statusDot.classList.remove("active");
    statusText.textContent = "Waiting for captions...";

    chrome.runtime.sendMessage({ type: "CLEAR_CAPTIONS" });
    showToast("Captions cleared");
  }

  // ============================================
  // Toggle Meet Captions Visibility
  // ============================================
  function toggleMeetCaptions() {
    hideMeetCaptions = !hideMeetCaptions;

    if (hideMeetCaptions) {
      btnHideCaptions.classList.add("active");
      btnHideCaptions.title = "Show Meet captions overlay";
    } else {
      btnHideCaptions.classList.remove("active");
      btnHideCaptions.title = "Hide Meet captions overlay";
    }

    chrome.runtime.sendMessage({
      type: "TOGGLE_MEET_CAPTIONS",
      hide: hideMeetCaptions,
    });
  }

  // ============================================
  // Search
  // ============================================
  let searchDebounce = null;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      searchQuery = e.target.value.trim();
      renderCaptions();
    }, 200);
  });

  // ============================================
  // Toast Notification
  // ============================================
  function showToast(message) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // ============================================
  // Settings: Load / Save / Apply
  // ============================================
  function loadSettings(callback) {
    chrome.storage.local.get(["settings"], (data) => {
      if (data.settings) {
        settings = { ...SETTINGS_DEFAULTS, ...data.settings };
      }
      if (callback) callback();
    });
  }

  function saveSettings() {
    chrome.storage.local.set({ settings });
  }

  function applySettings() {
    const root = document.documentElement;

    // Theme
    if (settings.theme === "auto") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      root.setAttribute("data-theme", settings.theme);
    }

    // Font size
    document.body.style.fontSize = settings.fontSize + "px";

    // Compact
    root.setAttribute("data-compact", settings.compact ? "true" : "false");

    // High contrast
    root.setAttribute("data-high-contrast", settings.highContrast ? "true" : "false");

    // Reduced motion
    root.setAttribute("data-reduced-motion", settings.reducedMotion ? "true" : "false");

    // Auto-scroll
    isAutoScroll = settings.autoScroll;

    // Auto-hide Meet overlay
    if (settings.autoHide && !hideMeetCaptions) {
      hideMeetCaptions = true;
      btnHideCaptions.classList.add("active");
      btnHideCaptions.title = "Show Meet captions overlay";
      chrome.runtime.sendMessage({ type: "TOGGLE_MEET_CAPTIONS", hide: true });
    }

    // Sync settings UI controls
    syncSettingsUI();
  }

  function syncSettingsUI() {
    // Selects
    document.getElementById("setting-theme").value = settings.theme;
    document.getElementById("setting-font-size").value = settings.fontSize;
    document.getElementById("setting-export-format").value = settings.exportFormat;
    document.getElementById("setting-max-captions").value = settings.maxCaptions;

    // Toggles
    document.getElementById("setting-compact").checked = settings.compact;
    document.getElementById("setting-auto-hide").checked = settings.autoHide;
    document.getElementById("setting-auto-scroll").checked = settings.autoScroll;
    document.getElementById("setting-merge-speaker").checked = settings.mergeSpeaker;
    document.getElementById("setting-export-timestamps").checked = settings.exportTimestamps;
    document.getElementById("setting-export-speakers").checked = settings.exportSpeakers;
    document.getElementById("setting-sound").checked = settings.sound;
    document.getElementById("setting-badge").checked = settings.badge;
    document.getElementById("setting-auto-save").checked = settings.autoSave;
    document.getElementById("setting-clear-on-end").checked = settings.clearOnEnd;
    document.getElementById("setting-high-contrast").checked = settings.highContrast;
    document.getElementById("setting-reduced-motion").checked = settings.reducedMotion;
  }

  function onSettingChange(key, value) {
    settings[key] = value;
    saveSettings();
    applySettings();
  }

  // ============================================
  // Settings: View Toggle
  // ============================================
  function openSettings() {
    settingsOpen = true;
    settingsPanel.classList.remove("hidden");
    captionsContainer.style.display = "none";
    scrollBottomBtn.style.display = "none";
    searchBar.style.display = "none";
    btnSettings.classList.add("active");
    syncSettingsUI();
  }

  function closeSettings() {
    settingsOpen = false;
    settingsPanel.classList.add("hidden");
    captionsContainer.style.display = "";
    searchBar.style.display = "";
    btnSettings.classList.remove("active");
    if (isAutoScroll) scrollToBottom();
  }

  // ============================================
  // Settings: Event Bindings
  // ============================================
  btnSettings.addEventListener("click", () => {
    if (settingsOpen) closeSettings();
    else openSettings();
  });

  btnSettingsBack.addEventListener("click", closeSettings);

  // Select inputs
  document.getElementById("setting-theme").addEventListener("change", (e) => onSettingChange("theme", e.target.value));
  document.getElementById("setting-font-size").addEventListener("change", (e) => onSettingChange("fontSize", e.target.value));
  document.getElementById("setting-export-format").addEventListener("change", (e) => onSettingChange("exportFormat", e.target.value));
  document.getElementById("setting-max-captions").addEventListener("change", (e) => onSettingChange("maxCaptions", e.target.value));

  // Toggle inputs
  document.getElementById("setting-compact").addEventListener("change", (e) => onSettingChange("compact", e.target.checked));
  document.getElementById("setting-auto-hide").addEventListener("change", (e) => onSettingChange("autoHide", e.target.checked));
  document.getElementById("setting-auto-scroll").addEventListener("change", (e) => onSettingChange("autoScroll", e.target.checked));
  document.getElementById("setting-merge-speaker").addEventListener("change", (e) => onSettingChange("mergeSpeaker", e.target.checked));
  document.getElementById("setting-export-timestamps").addEventListener("change", (e) => onSettingChange("exportTimestamps", e.target.checked));
  document.getElementById("setting-export-speakers").addEventListener("change", (e) => onSettingChange("exportSpeakers", e.target.checked));
  document.getElementById("setting-sound").addEventListener("change", (e) => onSettingChange("sound", e.target.checked));
  document.getElementById("setting-badge").addEventListener("change", (e) => onSettingChange("badge", e.target.checked));
  document.getElementById("setting-auto-save").addEventListener("change", (e) => onSettingChange("autoSave", e.target.checked));
  document.getElementById("setting-clear-on-end").addEventListener("change", (e) => onSettingChange("clearOnEnd", e.target.checked));
  document.getElementById("setting-high-contrast").addEventListener("change", (e) => onSettingChange("highContrast", e.target.checked));
  document.getElementById("setting-reduced-motion").addEventListener("change", (e) => onSettingChange("reducedMotion", e.target.checked));

  // Reset
  btnResetSettings.addEventListener("click", () => {
    if (!confirm("Reset all settings to defaults?")) return;
    settings = { ...SETTINGS_DEFAULTS };
    saveSettings();
    applySettings();
    showToast("Settings reset");
  });

  // Listen for system theme changes when in "auto" mode
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (settings.theme === "auto") applySettings();
  });

  // ============================================
  // Event Listeners
  // ============================================
  btnDownload.addEventListener("click", downloadTranscript);
  btnClear.addEventListener("click", clearCaptions);
  btnHideCaptions.addEventListener("click", toggleMeetCaptions);

  // ============================================
  // Message Handling
  // ============================================
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "CAPTION_UPDATE") {
      addOrUpdateCaption(message.data);
    }

    if (message.type === "MEETING_CHANGED") {
      // New meeting — reset everything
      captions = [];
      speakerColors = {};
      speakerColorIndex = 0;
      speakerAvatarUrls = {};
      startTime = null;
      newMessageCount = 0;
      meetingTitle = message.title || "";
      meetingUrl = message.meetingUrl || "";

      if (durationInterval) {
        clearInterval(durationInterval);
        durationInterval = null;
      }

      durationEl.textContent = "0:00";
      renderCaptions();

      statusDot.classList.remove("active");
      statusText.textContent = "Waiting for captions...";
    }
  });

  // ============================================
  // Initialize
  // ============================================
  function initialize() {
    btnHideCaptions.classList.remove("active");
    btnHideCaptions.title = "Hide Meet captions overlay";

    // Load settings first, then apply and load captions
    loadSettings(() => {
      applySettings();

      chrome.runtime.sendMessage({ type: "GET_CAPTIONS" }, (response) => {
        if (response) {
          meetingTitle = response.meetingTitle || "";
          meetingUrl = response.meetingUrl || "";

          if (response.captions && response.captions.length > 0) {
            captions = response.captions;
            startTime = captions[0].timestamp;
            startDurationTimer();
            renderCaptions();
            statusDot.classList.add("active");
            statusText.textContent = "Capturing captions...";
          }
        }
      });
    });
  }

  initialize();
})();
