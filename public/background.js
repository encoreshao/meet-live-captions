// Background service worker for Meet - Live Captions
//
// KEY DESIGN: Captions persist across meeting changes and URL navigation.
// They are only cleared when the user explicitly clicks "Clear All".
// To avoid captionId collisions between meetings, each caption gets a
// composite ID: `meetingId_originalCaptionId`.

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
    chrome.storage.session.set({ captions: [], meetingId: null });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "MEETING_STARTED") {
    const newMeetingId = message.meetingId || generateMeetingId();

    // Always update meeting metadata (title, URL, current meetingId).
    // NEVER clear captions — the user decides when to clear.
    chrome.storage.session.set({
      meetingId: newMeetingId,
      meetingTitle: message.title || "Google Meet",
      meetingUrl: message.meetingUrl || "",
    });

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
