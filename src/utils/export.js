import { formatTime, formatDuration, formatSrtTime } from "./format";

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
