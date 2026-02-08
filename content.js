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
    //   Pass 1: Same position + same speaker (most stable match)
    //   Pass 2: Same speaker in any unused previous slot (handles shifts)
    //   Pass 3: Assign new captionIds for genuinely new entries
    const matchedCaptionIds = new Array(entries.length).fill(null);
    const usedPrev = new Set();

    // Pass 1: Positional match (same index, same speaker)
    for (let i = 0; i < entries.length; i++) {
      if (i < prevEntries.length && prevEntries[i].speaker === entries[i].speaker) {
        matchedCaptionIds[i] = prevEntries[i].captionId;
        usedPrev.add(i);
      }
    }

    // Pass 2: Speaker-name match for unmatched entries
    for (let i = 0; i < entries.length; i++) {
      if (matchedCaptionIds[i] != null) continue;
      for (let j = 0; j < prevEntries.length; j++) {
        if (usedPrev.has(j)) continue;
        if (prevEntries[j].speaker === entries[i].speaker) {
          matchedCaptionIds[i] = prevEntries[j].captionId;
          usedPrev.add(j);
          break;
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
        try {
          chrome.runtime.sendMessage({
            type: "CAPTION_UPDATE",
            captionId: captionId,
            data: {
              speaker: entry.speaker,
              text: entry.text,
              timestamp: now,
              captionId: captionId,
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

    waitForCaptions();
  }

  if (document.readyState === "complete") {
    setTimeout(init, 1000);
  } else {
    window.addEventListener("load", () => setTimeout(init, 2000));
  }
})();
