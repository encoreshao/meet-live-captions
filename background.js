// Background service worker for Meet - Live Captions
//
// Uses captionId to update captions in place instead of stacking duplicates.

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Enable side panel on Google Meet tabs
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.url && tab.url.includes("meet.google.com")) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: "sidepanel.html",
      enabled: true,
    });
  }
});

// Relay messages between content script and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CAPTION_UPDATE") {
    const captionId = message.captionId;

    chrome.storage.session.get(["captions", "meetingId"], (data) => {
      const captions = data.captions || [];

      // Find existing caption with same captionId
      const existingIdx = captions.findIndex(c => c.captionId === captionId);

      if (existingIdx >= 0) {
        // UPDATE existing entry in place
        captions[existingIdx] = message.data;
      } else {
        // NEW entry
        captions.push(message.data);
      }

      chrome.storage.session.set({
        captions,
        meetingId: message.meetingId || data.meetingId || generateMeetingId(),
      });
    });

    // Forward to side panel
    chrome.runtime.sendMessage(message).catch(() => {});
  }

  if (message.type === "GET_CAPTIONS") {
    chrome.storage.session.get(["captions", "meetingId", "meetingTitle", "meetingUrl"], (data) => {
      sendResponse({
        captions: data.captions || [],
        meetingId: data.meetingId || null,
        meetingTitle: data.meetingTitle || null,
        meetingUrl: data.meetingUrl || null,
      });
    });
    return true;
  }

  if (message.type === "CLEAR_CAPTIONS") {
    chrome.storage.session.set({ captions: [], meetingId: generateMeetingId() });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "MEETING_STARTED") {
    const newMeetingId = message.meetingId || generateMeetingId();

    chrome.storage.session.get(["meetingId"], (data) => {
      const oldMeetingId = data.meetingId;

      if (oldMeetingId && oldMeetingId !== newMeetingId) {
        // Meeting changed — clear old captions
        chrome.storage.session.set({
          meetingId: newMeetingId,
          meetingTitle: message.title || "Google Meet",
          meetingUrl: message.meetingUrl || "",
          captions: [],
        });

        // Notify side panel to reset
        chrome.runtime.sendMessage({
          type: "MEETING_CHANGED",
          meetingId: newMeetingId,
          title: message.title || "Google Meet",
          meetingUrl: message.meetingUrl || "",
        }).catch(() => {});
      } else if (!oldMeetingId) {
        // First meeting — initialize
        chrome.storage.session.set({
          meetingId: newMeetingId,
          meetingTitle: message.title || "Google Meet",
          meetingUrl: message.meetingUrl || "",
          captions: [],
        });
      }
      // If same meetingId, do nothing (page refresh — keep captions)
    });
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
