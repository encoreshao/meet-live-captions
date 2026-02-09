import { formatTime, formatDuration, formatSrtTime } from "./format";

/**
 * Parse an uploaded transcript file back into captions data.
 * Supports JSON, SRT, and TXT formats exported by this extension.
 * @param {string} content - Raw file content
 * @param {string} filename - Original filename (used to detect format)
 * @returns {{ captions: Array, meta: Object }} Parsed captions and meeting metadata
 */
export function parseTranscript(content, filename) {
  const ext = filename.split(".").pop().toLowerCase();

  if (ext === "json") {
    return parseJsonImport(content);
  } else if (ext === "srt") {
    return parseSrtImport(content);
  } else {
    return parseTxtImport(content);
  }
}

function parseJsonImport(content) {
  const data = JSON.parse(content);

  if (!data.captions || !Array.isArray(data.captions)) {
    throw new Error("Invalid JSON transcript: missing captions array");
  }

  const baseTimestamp = data.captions[0]?.timestamp || Date.now();
  const captions = data.captions.map((c, i) => ({
    captionId: `imported_${i}`,
    text: c.text || "",
    speaker: c.speaker || "Unknown",
    timestamp: c.timestamp || baseTimestamp + i * 1000,
  }));

  return {
    captions,
    meta: {
      meetingTitle: data.meetingTitle || "Imported Transcript",
      meetingUrl: data.meetingUrl || "",
      date: data.date || null,
    },
  };
}

function parseSrtImport(content) {
  const blocks = content.trim().split(/\n\n+/);
  const captions = [];
  // Base timestamp: use current time minus total duration so the times make sense
  const baseTimestamp = Date.now();

  blocks.forEach((block, i) => {
    const lines = block.split("\n");
    if (lines.length < 3) return;

    // Line 0: sequence number, Line 1: timecodes, Line 2+: text
    const timecodeMatch = lines[1]?.match(
      /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/
    );
    if (!timecodeMatch) return;

    const startMs =
      parseInt(timecodeMatch[1]) * 3600000 +
      parseInt(timecodeMatch[2]) * 60000 +
      parseInt(timecodeMatch[3]) * 1000 +
      parseInt(timecodeMatch[4]);

    const textContent = lines.slice(2).join(" ").trim();
    // Check for "Speaker: text" format
    const speakerMatch = textContent.match(/^(.+?):\s+(.+)$/);

    captions.push({
      captionId: `imported_${i}`,
      text: speakerMatch ? speakerMatch[2] : textContent,
      speaker: speakerMatch ? speakerMatch[1] : "Unknown",
      timestamp: baseTimestamp + startMs,
    });
  });

  if (captions.length === 0) {
    throw new Error("No captions found in SRT file");
  }

  return {
    captions,
    meta: {
      meetingTitle: "Imported Transcript",
      meetingUrl: "",
    },
  };
}

function parseTxtImport(content) {
  const lines = content.split("\n");
  const captions = [];
  const baseTimestamp = Date.now();
  let currentSpeaker = "Unknown";
  let metaTitle = "Imported Transcript";
  let metaUrl = "";
  let inHeader = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Parse header section
    if (inHeader) {
      if (line.startsWith("Title: ")) {
        metaTitle = line.slice(7).trim();
        continue;
      }
      if (line.startsWith("Meeting: ")) {
        metaUrl = line.slice(9).trim();
        continue;
      }
      // End of header is after the second "===" line
      if (line.startsWith("===") && i > 0) {
        inHeader = false;
        continue;
      }
      continue;
    }

    // Skip empty lines
    if (!line.trim()) continue;

    // Try to match "[HH:MM:SS] Speaker Name:" line
    const speakerWithTimeMatch = line.match(/^\[(\d{1,2}:\d{2}:\d{2}\s*[AP]?M?)\]\s+(.+):$/);
    if (speakerWithTimeMatch) {
      currentSpeaker = speakerWithTimeMatch[2].trim();
      continue;
    }

    // Try to match "Speaker Name:" line (no timestamp)
    const speakerMatch = line.match(/^([^\s][^:]+):$/);
    if (speakerMatch && !line.startsWith("  ")) {
      currentSpeaker = speakerMatch[1].trim();
      continue;
    }

    // Try to match caption text (indented with 2 spaces)
    const captionWithTimeMatch = line.match(/^\[(\d{1,2}:\d{2}:\d{2}\s*[AP]?M?)\]\s+(.+)$/);
    const textMatch = line.match(/^\s{2}(.+)$/);

    if (textMatch) {
      captions.push({
        captionId: `imported_${captions.length}`,
        text: textMatch[1].trim(),
        speaker: currentSpeaker,
        timestamp: baseTimestamp + captions.length * 1000,
      });
    } else if (captionWithTimeMatch) {
      // Timestamp-prefixed text without speaker header (exportSpeakers=false)
      captions.push({
        captionId: `imported_${captions.length}`,
        text: captionWithTimeMatch[2].trim(),
        speaker: currentSpeaker,
        timestamp: baseTimestamp + captions.length * 1000,
      });
    }
  }

  if (captions.length === 0) {
    throw new Error("No captions found in TXT file");
  }

  return {
    captions,
    meta: {
      meetingTitle: metaTitle,
      meetingUrl: metaUrl,
    },
  };
}

/**
 * Generate and download a transcript file
 * @param {Array} captions - Array of { speaker, text, timestamp, captionId }
 * @param {Object} settings - Current settings object
 * @param {Object} meta - { meetingTitle, meetingUrl, startTime }
 */
export function downloadTranscript(captions, settings, meta) {
  if (captions.length === 0) return false;

  const { exportFormat, exportTimestamps, exportSpeakers } = settings;
  const { meetingTitle, meetingUrl, startTime } = meta;

  let content, mimeType, extension;

  if (exportFormat === "json") {
    content = buildJsonExport(captions, exportTimestamps, exportSpeakers, meta);
    mimeType = "application/json;charset=utf-8";
    extension = "json";
  } else if (exportFormat === "srt") {
    content = buildSrtExport(captions, exportSpeakers);
    mimeType = "text/plain;charset=utf-8";
    extension = "srt";
  } else {
    content = buildTxtExport(captions, exportTimestamps, exportSpeakers, meta);
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
  return true;
}

function buildJsonExport(captions, includeTimestamps, includeSpeakers, meta) {
  const data = {
    meetingTitle: meta.meetingTitle || "Google Meet",
    meetingUrl: meta.meetingUrl || "",
    date: new Date().toISOString(),
    duration: meta.startTime ? formatDuration(Date.now() - meta.startTime) : null,
    participants: [...new Set(captions.map((c) => c.speaker))],
    captions: captions.map((c) => {
      const entry = { text: c.text };
      if (includeSpeakers) entry.speaker = c.speaker;
      if (includeTimestamps) entry.timestamp = c.timestamp;
      return entry;
    }),
  };
  return JSON.stringify(data, null, 2);
}

function buildSrtExport(captions, includeSpeakers) {
  let srt = "";
  captions.forEach((caption, i) => {
    const startMs = caption.timestamp - (captions[0]?.timestamp || caption.timestamp);
    const endMs = startMs + 3000;
    srt += `${i + 1}\n`;
    srt += `${formatSrtTime(startMs)} --> ${formatSrtTime(endMs)}\n`;
    if (includeSpeakers) srt += `${caption.speaker}: `;
    srt += `${caption.text}\n\n`;
  });
  return srt;
}

function buildTxtExport(captions, includeTimestamps, includeSpeakers, meta) {
  const participants = [...new Set(captions.map((c) => c.speaker))];
  let text = "GOOGLE MEET TRANSCRIPT\n";
  text += "=".repeat(50) + "\n";
  if (meta.meetingTitle) text += `Title: ${meta.meetingTitle}\n`;
  if (meta.meetingUrl) text += `Meeting: ${meta.meetingUrl}\n`;
  text += `Date: ${new Date().toLocaleDateString()}\n`;
  if (meta.startTime) text += `Duration: ${formatDuration(Date.now() - meta.startTime)}\n`;
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
  return text;
}
