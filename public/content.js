// Content script: Captures Google Meet live captions
//
// KEY DESIGN: Supports multi-speaker captions. The caption region is parsed
// into separate entries per speaker using multiple detection strategies:
//   1. Font-size / bold markers (speaker names are smaller/bolder)
//   2. DOM structure (each child of the entry container = one speaker)
// Each entry gets a unique captionId matched by position across polls,
// so the side panel can update each speaker's text in place.

(function () {
  "use strict";

  let meetingId = null;
  let isHidden = false;
  let lastCaptionText = "";

  // Multi-speaker turn tracking (position-based)
  let lastEntries = []; // [{ speaker, text, captionId }]
  let nextCaptionId = 0;

  // Speaker avatar cache: { "Speaker Name": "https://...image-url" }
  let speakerAvatars = {};
  let avatarScanTimer = null;

  function log(...args) {
    console.log("[MCP]", ...args);
  }

  function getMeetingId() {
    const m = window.location.pathname.match(/\/([a-z]{3}-[a-z]{4}-[a-z]{3})/);
    return m ? m[1] : `meet_${Date.now()}`;
  }

  // ============================================
  // Find the caption text element using EXACT selectors
  // ============================================
  function getCaptionRegion() {
    return document.querySelector('div[role="region"][aria-label="Captions"]')
      || document.querySelector('div.iOzk7 div[role="region"]')
      || document.querySelector('div.iOzk7');
  }

  function getCaptionBar() {
    const iozk7 = document.querySelector('div.iOzk7');
    if (iozk7) {
      let el = iozk7;
      while (el.parentElement) {
        el = el.parentElement;
        if (el.classList.contains('hLkVuf') || el.getAttribute('data-side') === '3') {
          return el;
        }
        if (el === document.body) break;
      }
      const dtj7e = iozk7.closest('.DtJ7e');
      if (dtj7e) return dtj7e;
    }
    return null;
  }

  // ============================================
  // Extract ALL caption entries from the region (multi-speaker)
  //
  // Strategy 1: Split leaves by font-size/bold markers (speaker names are
  //             typically smaller or bolder than caption text)
  // Strategy 2: DOM structure — find caption entry containers (each child
  //             of the right ancestor = one speaker entry)
  // Strategy 3: Single-entry fallback
  // ============================================
  function extractAllCaptions(region) {
    if (!region) return [];

    // Strategy 1: Marker-based splitting (font-size / bold)
    const allLeaves = [];
    collectTextLeaves(region, allLeaves);
    if (allLeaves.length === 0) return [];

    const markerEntries = splitByMarkers(allLeaves);
    if (markerEntries.length > 0) return markerEntries;

    // Strategy 2: DOM structure — each child of a container = one entry
    const structEntries = splitByStructure(region);
    if (structEntries.length > 0) return structEntries;

    // Strategy 3: Single entry fallback
    const text = allLeaves.map(l => l.text).join(" ").trim();
    return text ? [{ speaker: "You", text }] : [];
  }

  // Identify speaker-name leaves by font-size or bold, then split
  function splitByMarkers(leaves) {
    if (leaves.length < 2) return [];

    const sizes = leaves.map(l => l.fontSize);
    const maxSize = Math.max(...sizes);
    const minSize = Math.min(...sizes);
    const hasSizeDiff = (maxSize - minSize) > 0.5;

    function isMarker(leaf) {
      if (leaf.text.length >= 50) return false;
      if (leaf.isBold) return true;
      if (hasSizeDiff && leaf.fontSize < maxSize - 0.5) return true;
      return false;
    }

    if (!leaves.some(l => isMarker(l))) return []; // No markers found

    const entries = [];
    let curSpeaker = null;
    let curTexts = [];

    for (const leaf of leaves) {
      if (isMarker(leaf)) {
        if (curTexts.length > 0) {
          const text = curTexts.join(" ").trim();
          if (text) entries.push({ speaker: curSpeaker || "You", text });
        }
        curSpeaker = leaf.text;
        curTexts = [];
      } else {
        curTexts.push(leaf.text);
      }
    }

    if (curTexts.length > 0) {
      const text = curTexts.join(" ").trim();
      if (text) entries.push({ speaker: curSpeaker || "You", text });
    }

    return entries;
  }

  // Split by DOM children: drill down to the level where siblings = entries
  function splitByStructure(region) {
    // Drill through single-child wrappers to find the entry container
    let container = region;
    while (
      container.children.length === 1 &&
      container.children[0].children &&
      container.children[0].children.length > 0
    ) {
      container = container.children[0];
    }

    if (container.children.length < 2) return [];

    const entries = [];
    for (const child of Array.from(container.children)) {
      const leaves = [];
      collectTextLeaves(child, leaves);
      if (leaves.length < 1) continue;

      if (leaves.length === 1) {
        // Single leaf — treat as text only
        entries.push({ speaker: "You", text: leaves[0].text });
        continue;
      }

      // Multiple leaves: first short leaf = speaker, rest = text
      let speaker = "";
      const textParts = [];

      for (let i = 0; i < leaves.length; i++) {
        const leaf = leaves[i];
        if (!speaker && i === 0 && leaf.text.length < 40) {
          speaker = leaf.text;
        } else {
          textParts.push(leaf.text);
        }
      }

      const text = textParts.join(" ").trim();
      if (text) entries.push({ speaker: speaker || "You", text });
    }

    return entries;
  }

  function collectTextLeaves(el, out) {
    if (!el) return;
    if (el instanceof SVGElement || el.tagName === "svg" || el.tagName === "SVG") return;
    if (el.tagName === "BUTTON") return;
    if (el.getAttribute && el.getAttribute("role") === "button") return;
    if (el.getAttribute && el.getAttribute("aria-hidden") === "true") return;
    const cls = typeof el.className === "string" ? el.className : "";
    if (cls.includes("material-icons") || cls.includes("google-symbols") || cls.includes("google-material-icons")) return;
    if (el.tagName === "IMG") return;

    if (!el.children || el.children.length === 0) {
      const text = (el.textContent || "").trim();
      if (text.length > 0 && !isJunk(text)) {
        let isBold = false;
        let fontSize = 14;
        try {
          const style = window.getComputedStyle(el);
          const fw = parseInt(style.fontWeight);
          isBold = fw >= 500 || el.tagName === "B" || el.tagName === "STRONG";
          fontSize = parseFloat(style.fontSize) || 14;
        } catch (e) {}
        out.push({ text, isBold, fontSize });
      }
      return;
    }

    for (const child of el.children) {
      collectTextLeaves(child, out);
    }
  }

  const JUNK_TEXTS = new Set([
    "arrow_downward", "arrow_upward", "more_vert",
    "close", "expand_more", "expand_less", "jump to bottom",
  ]);

  function isJunk(text) {
    if (text.length <= 1) return true;
    return JUNK_TEXTS.has(text.toLowerCase().trim());
  }

  // ============================================
  // Avatar Extraction — scan Meet DOM for profile images
  //
  // Google Meet shows profile images in several places:
  //   1. Video tiles: img inside participant video containers
  //   2. Participants panel: img elements with participant names nearby
  //   3. Caption entries: sometimes small avatars next to speaker names
  // We scan periodically and build a name → avatar URL map.
  // ============================================
  function scanForAvatars() {
    // Strategy 1: Video tiles — profile images shown when camera is off
    // These are typically large circular images with the person's photo
    document.querySelectorAll('img[src*="googleusercontent.com"]').forEach((img) => {
      const src = img.src;
      if (!src || src.includes("icon") || img.width < 20) return;

      // Look for a name near this image
      const name = findNameNearImage(img);
      if (name && !speakerAvatars[name]) {
        speakerAvatars[name] = src;
        log("Avatar found for:", name);
      }
    });

    // Strategy 2: Participant list panel
    // Each participant entry has an img and a name span
    document.querySelectorAll('[data-participant-id]').forEach((el) => {
      const img = el.querySelector('img[src*="googleusercontent.com"]');
      if (!img) return;

      // Find the participant name in the same container
      const nameEl = el.querySelector('[data-self-name], [data-tooltip]');
      const name = nameEl
        ? (nameEl.getAttribute('data-self-name') || nameEl.getAttribute('data-tooltip') || nameEl.textContent || "").trim()
        : "";

      if (!name) {
        // Fallback: look for text content that isn't an icon
        const texts = [];
        el.querySelectorAll('span').forEach((span) => {
          const t = span.textContent.trim();
          if (t.length > 1 && t.length < 50 && !isJunk(t)) texts.push(t);
        });
        const fallbackName = texts[0];
        if (fallbackName && img.src && !speakerAvatars[fallbackName]) {
          speakerAvatars[fallbackName] = img.src;
          log("Avatar found (participant panel) for:", fallbackName);
        }
        return;
      }

      if (name && img.src && !speakerAvatars[name]) {
        speakerAvatars[name] = img.src;
        log("Avatar found (participant panel) for:", name);
      }
    });

    // Strategy 3: Self-view — the local user's avatar
    const selfView = document.querySelector('[data-self-name]');
    if (selfView) {
      const selfName = selfView.getAttribute('data-self-name');
      if (selfName && !speakerAvatars[selfName]) {
        const selfImg = selfView.closest('[data-participant-id]')?.querySelector('img[src*="googleusercontent.com"]')
          || document.querySelector('img[data-iml][src*="googleusercontent.com"]');
        if (selfImg && selfImg.src) {
          speakerAvatars[selfName] = selfImg.src;
          log("Avatar found (self) for:", selfName);
        }
      }
    }
  }

  function findNameNearImage(img) {
    // Walk up to find a container that also has text (the person's name)
    let el = img.parentElement;
    for (let i = 0; i < 5 && el; i++) {
      // Look for a name label in a sibling or child
      const nameEl = el.querySelector('[data-self-name]')
        || el.querySelector('[data-tooltip]');
      if (nameEl) {
        const name = (nameEl.getAttribute('data-self-name')
          || nameEl.getAttribute('data-tooltip')
          || nameEl.textContent || "").trim();
        if (name && name.length > 1 && name.length < 50) return name;
      }

      // Look for visible text spans near the image
      const spans = el.querySelectorAll('span, div');
      for (const span of spans) {
        if (span.contains(img)) continue;
        const t = span.textContent.trim();
        if (t.length > 1 && t.length < 40 && !isJunk(t)) {
          // Verify it looks like a name (not a button label or icon text)
          const style = window.getComputedStyle(span);
          const fs = parseFloat(style.fontSize);
          if (fs >= 10 && fs <= 18) return t;
        }
      }

      el = el.parentElement;
    }
    return null;
  }

  function getAvatarForSpeaker(speaker) {
    if (!speaker) return null;

    // Exact match
    if (speakerAvatars[speaker]) return speakerAvatars[speaker];

    // Partial match (e.g. "John" matches "John Doe")
    for (const [name, url] of Object.entries(speakerAvatars)) {
      if (name.startsWith(speaker) || speaker.startsWith(name)) return url;
    }

    return null;
  }

  function startAvatarScanning() {
    // Scan immediately, then periodically
    scanForAvatars();
    if (!avatarScanTimer) {
      avatarScanTimer = setInterval(scanForAvatars, 5000);
    }
  }

  // ============================================
  // Hide / Show the caption bar + reclaim space for video
  //
  // Uses a single injected <style> tag instead of inline style manipulation.
  // This avoids conflicting with Meet's own JS layout management and
  // ensures atomic cleanup (just remove the tag) — no stale styles.
  // ============================================
  let mcpStyleTag = null;

  function hideCaptionBar() {
    const bar = getCaptionBar();
    if (!bar || bar.dataset.mcpHidden === "1") return;

    // Measure the caption bar height BEFORE hiding it
    const barHeight = bar.offsetHeight || bar.getBoundingClientRect().height || 0;

    // Mark the bar so CSS can target it
    bar.dataset.mcpHidden = "1";

    // Compute new bottom for <main>:
    //   current bottom (e.g. 296px) – caption bar height (e.g. ~216px) = toolbar-only bottom (e.g. 80px)
    const main = document.querySelector("main.axUSnc");
    let mainRule = "";
    if (main && barHeight > 0) {
      const inset = main.style.inset;
      if (inset) {
        const parts = inset.trim().split(/\s+/);
        // inset: top right bottom [left]
        if (parts.length >= 3) {
          const currentBottom = parseInt(parts[2], 10);
          if (!isNaN(currentBottom)) {
            const newBottom = Math.max(0, currentBottom - barHeight);
            mainRule = `main.axUSnc { bottom: ${newBottom}px !important; }`;
          }
        }
      }
    }

    // Inject a single <style> tag for all visual changes
    if (!mcpStyleTag) {
      mcpStyleTag = document.createElement("style");
      mcpStyleTag.id = "mcp-caption-hide";
      document.head.appendChild(mcpStyleTag);
    }
    mcpStyleTag.textContent = `
      [data-mcp-hidden="1"] {
        height: 0 !important;
        min-height: 0 !important;
        max-height: 0 !important;
        overflow: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      ${mainRule}
    `;

    log("Caption bar hidden, barHeight:", barHeight, "mainRule:", mainRule);
  }

  function showCaptionBar() {
    // Remove the injected CSS — atomic cleanup, no stale styles
    if (mcpStyleTag) {
      mcpStyleTag.remove();
      mcpStyleTag = null;
    }

    // Clean up data attributes
    document.querySelectorAll("[data-mcp-hidden]").forEach((el) => {
      delete el.dataset.mcpHidden;
    });

    log("Caption bar shown");
  }

  // ============================================
  // Observe the caption region
  // ============================================
  let observer = null;
  let pollTimer = null;
  let debounceTimer = null;
  let watchdogTimer = null;

  function stopObserving() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (watchdogTimer) {
      clearInterval(watchdogTimer);
      watchdogTimer = null;
    }
  }

  function startObserving() {
    const region = getCaptionRegion();
    if (!region) return false;

    // Clean up any previous observer before starting a new one
    stopObserving();

    log("Found caption region, starting observer");
    pollCaptions();

    observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(pollCaptions, 100);
    });
    observer.observe(region, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Watchdog: detect if the caption region is removed from the DOM
    // (e.g. user toggled captions off in Meet) and restart waiting
    watchdogTimer = setInterval(() => {
      const current = getCaptionRegion();
      if (!current || !document.body.contains(current)) {
        log("Caption region removed (captions toggled off?), restarting watcher");
        stopObserving();
        showCaptionBar(); // Clean up any hide styles so Meet's layout is fully restored
        lastCaptionText = ""; // Reset so we re-capture when captions come back
        lastEntries = [];     // Reset entry tracking
        waitForCaptions();
      }
    }, 2000);

    return true;
  }

  // Detect whether newText is a continuation of oldText (same utterance
  // being extended word by word) vs a completely new sentence.
  //
  // Live captions grow like: "Hello" → "Hello world" → "Hello world, how"
  // A new sentence looks like: "Hello world, how are you" → "Fine thank you"
  //
  // Heuristic: if the two texts share a common prefix that covers at least
  // 30% of the shorter one (min 3 chars), it's a continuation.
  function isContinuation(oldText, newText) {
    if (!oldText || !newText) return false;

    // One starts with the other → clearly a continuation
    if (newText.startsWith(oldText) || oldText.startsWith(newText)) return true;

    // Check common prefix length
    const minLen = Math.min(oldText.length, newText.length);
    const threshold = Math.max(3, Math.floor(minLen * 0.3));

    let commonLen = 0;
    for (let i = 0; i < minLen; i++) {
      if (oldText[i] === newText[i]) commonLen++;
      else break;
    }

    return commonLen >= threshold;
  }

  function pollCaptions() {
    const region = getCaptionRegion();
    if (!region) return;

    const rawText = region.textContent.trim();
    if (rawText === lastCaptionText) return;
    lastCaptionText = rawText;

    if (isHidden) hideCaptionBar();

    const entries = extractAllCaptions(region);
    if (entries.length === 0) return;

    const now = Date.now();
    const prevEntries = lastEntries;

    // ---- Match current entries to previous entries ----
    // Three-pass algorithm to correctly reuse captionIds:
    //   Pass 1: Same position + same speaker + continuation text
    //   Pass 2: Same speaker + continuation text in any unused slot
    //   Pass 3: Assign new captionIds for genuinely new entries
    //
    // KEY: We only reuse a captionId if the text is a continuation of
    // the previous text (same utterance growing word by word). If the
    // text changed completely (new sentence), we assign a new captionId
    // so the old message is kept as history in the side panel.
    const matchedCaptionIds = new Array(entries.length).fill(null);
    const usedPrev = new Set();

    // Pass 1: Positional match (same index, same speaker, text is continuation)
    for (let i = 0; i < entries.length; i++) {
      if (i < prevEntries.length && prevEntries[i].speaker === entries[i].speaker) {
        if (isContinuation(prevEntries[i].text, entries[i].text)) {
          matchedCaptionIds[i] = prevEntries[i].captionId;
          usedPrev.add(i);
        }
        // If text is completely different → leave unmatched → new captionId
      }
    }

    // Pass 2: Speaker-name match for unmatched entries (text must be continuation)
    for (let i = 0; i < entries.length; i++) {
      if (matchedCaptionIds[i] != null) continue;
      for (let j = 0; j < prevEntries.length; j++) {
        if (usedPrev.has(j)) continue;
        if (prevEntries[j].speaker === entries[i].speaker) {
          if (isContinuation(prevEntries[j].text, entries[i].text)) {
            matchedCaptionIds[i] = prevEntries[j].captionId;
            usedPrev.add(j);
            break;
          }
          // Different text → don't reuse, let Pass 3 assign new ID
        }
      }
    }

    // Pass 3: New captionIds for truly new entries
    for (let i = 0; i < entries.length; i++) {
      if (matchedCaptionIds[i] == null) {
        nextCaptionId++;
        matchedCaptionIds[i] = nextCaptionId;
        log(`New turn #${nextCaptionId} [${entries[i].speaker}]: ${entries[i].text}`);
      }
    }

    // ---- Build new state & send updates ----
    const newEntries = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const captionId = matchedCaptionIds[i];

      // Find previous text to skip unchanged entries
      const prevEntry = prevEntries.find(p => p.captionId === captionId);
      const prevText = prevEntry ? prevEntry.text : null;

      newEntries.push({ speaker: entry.speaker, text: entry.text, captionId });

      // Only send if text actually changed
      if (entry.text !== prevText) {
        const avatarUrl = getAvatarForSpeaker(entry.speaker);
        try {
          chrome.runtime.sendMessage({
            type: "CAPTION_UPDATE",
            captionId: captionId,
            data: {
              speaker: entry.speaker,
              text: entry.text,
              timestamp: now,
              captionId: captionId,
              avatarUrl: avatarUrl || null,
            },
            meetingId: meetingId,
          });
        } catch (e) {}
      }
    }

    lastEntries = newEntries;
  }

  function waitForCaptions() {
    if (startObserving()) return;

    // Clear any existing poll timer to prevent duplicates
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }

    log("Waiting for caption region to appear...");
    pollTimer = setInterval(() => {
      if (startObserving()) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }, 1000);
  }

  // ============================================
  // Meeting-end detection
  //
  // Three signals that the user left the meeting:
  //   1. The page shows "You left the meeting" / end-screen text
  //   2. The URL no longer matches the meeting pattern
  //   3. The page is unloading (tab close / navigation)
  //
  // IMPORTANT: We require multiple consecutive "not active" checks
  // (CONFIRM_THRESHOLD) before declaring meeting ended, to avoid
  // false positives from momentary DOM changes during an active call.
  //
  // We intentionally do NOT kill the MutationObserver or poll timers
  // when the meeting ends — the content script keeps running so that
  // if the detection was wrong, captions still work. The side panel
  // handles the UI (freeze timer, stop indicator).
  // ============================================
  let meetingEndTimer = null;
  let hasSentEnded = false;
  let notActiveCount = 0;
  const CONFIRM_THRESHOLD = 3; // Must fail 3 consecutive checks (≈9 seconds)

  function sendMeetingEnded() {
    if (hasSentEnded) return;
    hasSentEnded = true;

    log("Meeting ended — notifying background");
    try {
      chrome.runtime.sendMessage({
        type: "MEETING_ENDED",
        meetingId: meetingId,
        endTime: Date.now(),
      });
    } catch (e) {}

    // Stop the end-detection timer (no need to keep checking)
    if (meetingEndTimer) {
      clearInterval(meetingEndTimer);
      meetingEndTimer = null;
    }

    // NOTE: We do NOT stop the caption observer or poll timers here.
    // The content script keeps running so captions still work if
    // this was a false positive. The background/side-panel handle
    // the timer freeze.
  }

  function isMeetingActive() {
    // Signal 1: URL must still match the meeting pattern /abc-defg-hij
    const meetPattern = /\/[a-z]{3}-[a-z]{4}-[a-z]{3}/;
    if (!meetPattern.test(window.location.pathname)) {
      log("Meeting URL pattern gone — left meeting");
      return false;
    }

    // Signal 2: "You left" / end-screen text
    // Only check specific containers to avoid false matches from
    // chat messages or shared content. Google Meet shows the end
    // screen in a full-page overlay.
    const bodyText = document.body.innerText || "";
    const endPhrases = [
      "You left the meeting",
      "You've left the meeting",
      "The meeting has ended",
      "You were removed from the meeting",
      "Return to home screen",
    ];
    for (const phrase of endPhrases) {
      if (bodyText.includes(phrase)) {
        log(`End-screen text detected: "${phrase}"`);
        return false;
      }
    }

    // If none of the above triggered, the meeting is active
    return true;
  }

  function startMeetingEndDetection() {
    if (meetingEndTimer) return;

    meetingEndTimer = setInterval(() => {
      if (!isMeetingActive()) {
        notActiveCount++;
        log(`Meeting not active (${notActiveCount}/${CONFIRM_THRESHOLD})`);
        if (notActiveCount >= CONFIRM_THRESHOLD) {
          sendMeetingEnded();
        }
      } else {
        // Reset counter — meeting is alive
        notActiveCount = 0;
      }
    }, 3000); // Check every 3 seconds
  }

  // ============================================
  // Message handler
  // ============================================
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TOGGLE_MEET_CAPTIONS") {
      isHidden = msg.hide;
      if (isHidden) hideCaptionBar();
      else showCaptionBar();
    }
  });

  // ============================================
  // Init
  // ============================================
  function init() {
    meetingId = getMeetingId();
    log("Init for meeting:", meetingId);

    try {
      chrome.runtime.sendMessage({
        type: "MEETING_STARTED",
        meetingId,
        meetingUrl: window.location.href,
        title: document.title || "Google Meet",
      });
    } catch (e) {}

    startAvatarScanning();
    waitForCaptions();
    startMeetingEndDetection();

    // Detect page unload (tab close / navigation away)
    window.addEventListener("beforeunload", () => {
      sendMeetingEnded();
    });
  }

  if (document.readyState === "complete") {
    setTimeout(init, 1000);
  } else {
    window.addEventListener("load", () => setTimeout(init, 2000));
  }
})();
