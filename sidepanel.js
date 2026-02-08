// Side Panel Logic - Meet - Live Captions
//
// Uses captionId to update captions in place.
// Same captionId = same speaker turn = update existing DOM element.

(function () {
  "use strict";

  // ============================================
  // State
  // ============================================
  let captions = []; // Array of { speaker, text, timestamp, captionId }
  let speakerColors = {};
  let speakerColorIndex = 0;
  let isAutoScroll = true;
  let hideMeetCaptions = false;
  let searchQuery = "";
  let startTime = null;
  let durationInterval = null;
  let newMessageCount = 0;
  let meetingTitle = "";
  let meetingUrl = "";

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

    div.innerHTML = `
      <div class="caption-header">
        <div class="speaker-avatar speaker-color-${colorIndex}">${getSpeakerInitial(caption.speaker)}</div>
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

    const captionId = captionData.captionId;

    // Try to find existing caption with same captionId
    const existingIdx = captions.findIndex(c => c.captionId === captionId);

    if (existingIdx >= 0) {
      // ---- UPDATE existing caption in place ----
      captions[existingIdx].text = captionData.text;
      captions[existingIdx].timestamp = captionData.timestamp;

      // Update the DOM element directly (no re-render)
      const el = captionsList.querySelector(`[data-caption-id="${captionId}"] .caption-text`);
      if (el) {
        el.innerHTML = highlightSearch(escapeHtml(captionData.text));
      }
    } else {
      // ---- ADD new caption ----
      captions.push(captionData);
      emptyState.classList.add("hidden");

      const el = createCaptionElement(captionData);
      captionsList.appendChild(el);

      if (!isAutoScroll) {
        newMessageCount++;
        showScrollButton();
      }
    }

    updateStats();
    if (isAutoScroll) scrollToBottom();
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

    // Collect all unique participant names from captions
    const participants = [...new Set(captions.map(c => c.speaker))];

    let text = "GOOGLE MEET TRANSCRIPT\n";
    text += "=".repeat(50) + "\n";
    if (meetingTitle) {
      text += `Title: ${meetingTitle}\n`;
    }
    if (meetingUrl) {
      text += `Meeting: ${meetingUrl}\n`;
    }
    text += `Date: ${new Date().toLocaleDateString()}\n`;
    if (startTime) {
      text += `Duration: ${formatDuration(Date.now() - startTime)}\n`;
    }
    text += `Messages: ${captions.length}\n`;
    text += `Participants (${participants.length}): ${participants.join(", ")}\n`;
    text += "=".repeat(50) + "\n\n";

    let lastSpeaker = "";
    captions.forEach((caption) => {
      const time = formatTime(caption.timestamp);
      if (caption.speaker !== lastSpeaker) {
        text += `\n[${time}] ${caption.speaker}:\n`;
        lastSpeaker = caption.speaker;
      }
      text += `  ${caption.text}\n`;
    });

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meet-transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    showToast("Transcript downloaded");
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
  }

  initialize();
})();
