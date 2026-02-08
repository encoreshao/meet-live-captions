// Background service worker for Meet - Live Captions
//
// KEY DESIGN: Captions persist across meeting changes and URL navigation.
// They are only cleared when the user explicitly clicks "Clear All".
// To avoid captionId collisions between meetings, each caption gets a
// composite ID: `meetingId_originalCaptionId`.
//
// MEETING END DETECTION:
// Three layers detect when the user leaves a meeting:
//   1. Content script: DOM-based (toolbar gone, "You left" page, beforeunload)
//   2. Background (here): Tab closed or URL changed away from meeting pattern
//   3. Both send MEETING_ENDED → side panel freezes the timer
//
// We track which tab is the active meeting tab so we can detect closure.

// Track the active meeting tab
let meetingTabId = null;

// Meeting URL pattern: /abc-defg-hij
const MEETING_URL_RE = /meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/;

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Enable side panel on Google Meet tabs + detect URL changes away from meeting
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.url) return;

  if (tab.url.includes("meet.google.com")) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: "sidepanel.html",
      enabled: true,
    });

    // Track the meeting tab when it has a meeting URL
    if (MEETING_URL_RE.test(tab.url)) {
      meetingTabId = tabId;
    }
  }

  // Detect when the meeting tab navigates AWAY from a meeting URL
  // (e.g. user leaves → redirected to meet.google.com landing page)
  if (changeInfo.url && tabId === meetingTabId) {
    if (!MEETING_URL_RE.test(changeInfo.url)) {
      broadcastMeetingEnded();
      meetingTabId = null;
    }
  }
});

// Detect when the meeting tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === meetingTabId) {
    broadcastMeetingEnded();
    meetingTabId = null;
  }
});

function broadcastMeetingEnded() {
  const endTime = Date.now();

  // Persist endTime in storage so side panel can restore frozen timer
  chrome.storage.session.set({ endTime });

  // Notify side panel
  chrome.runtime.sendMessage({
    type: "MEETING_ENDED",
    endTime,
  }).catch(() => {});
}

// Relay messages between content script and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CAPTION_UPDATE") {
    // Build a composite captionId to avoid collisions across meetings.
    // The content script resets its counter for each new page/meeting,
    // so raw captionIds (1, 2, 3…) would overwrite previous meeting data.
    const meetingId = message.meetingId || "unknown";
    const compositeCaptionId = `${meetingId}_${message.captionId}`;

    // Attach the composite ID to the data payload
    const captionData = {
      ...message.data,
      captionId: compositeCaptionId,
    };

    chrome.storage.session.get(["captions", "meetingId"], (data) => {
      const captions = data.captions || [];

      // Find existing caption with same composite captionId
      const existingIdx = captions.findIndex(c => c.captionId === compositeCaptionId);

      if (existingIdx >= 0) {
        // UPDATE existing entry in place
        captions[existingIdx] = captionData;
      } else {
        // NEW entry — append
        captions.push(captionData);
      }

      chrome.storage.session.set({
        captions,
        meetingId: meetingId,
      });
    });

    // Forward to side panel using a RELAY type so the side panel can
    // distinguish it from the raw content-script message (which also
    // arrives via chrome.runtime.onMessage to all extension pages).
    chrome.runtime.sendMessage({
      type: "CAPTION_UPDATE_RELAY",
      captionId: compositeCaptionId,
      data: captionData,
    }).catch(() => {});
  }

  if (message.type === "GET_CAPTIONS") {
    chrome.storage.session.get(["captions", "meetingId", "meetingTitle", "meetingUrl", "endTime"], (data) => {
      sendResponse({
        captions: data.captions || [],
        meetingId: data.meetingId || null,
        meetingTitle: data.meetingTitle || null,
        meetingUrl: data.meetingUrl || null,
        endTime: data.endTime || null,
      });
    });
    return true;
  }

  if (message.type === "CLEAR_CAPTIONS") {
    chrome.storage.session.set({ captions: [], meetingId: null, endTime: null });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "MEETING_ENDED") {
    // Content script detected meeting end — persist and relay
    const endTime = message.endTime || Date.now();
    chrome.storage.session.set({ endTime });

    // Relay to side panel
    chrome.runtime.sendMessage({
      type: "MEETING_ENDED",
      endTime,
    }).catch(() => {});

    // Track the meeting tab from the sender
    if (sender?.tab?.id === meetingTabId) {
      meetingTabId = null;
    }
  }

  if (message.type === "MEETING_STARTED") {
    const newMeetingId = message.meetingId || generateMeetingId();

    // Always update meeting metadata (title, URL, current meetingId).
    // NEVER clear captions — the user decides when to clear.
    // Clear endTime so the timer starts ticking again for the new meeting.
    chrome.storage.session.set({
      meetingId: newMeetingId,
      meetingTitle: message.title || "Google Meet",
      meetingUrl: message.meetingUrl || "",
      endTime: null,
    });

    // Track the sender tab as the active meeting tab
    if (sender?.tab?.id) {
      meetingTabId = sender.tab.id;
    }

    // Notify side panel so it can update the displayed meeting info
    chrome.runtime.sendMessage({
      type: "MEETING_CHANGED",
      meetingId: newMeetingId,
      title: message.title || "Google Meet",
      meetingUrl: message.meetingUrl || "",
    }).catch(() => {});
  }

  if (message.type === "TOGGLE_MEET_CAPTIONS") {
    chrome.tabs.query({ url: "*://meet.google.com/*" }, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(tab.id, {
          type: "TOGGLE_MEET_CAPTIONS",
          hide: message.hide,
        }).catch(() => {});
      });
    });
  }
});

function generateMeetingId() {
  return `meet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
