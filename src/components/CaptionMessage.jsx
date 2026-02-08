import React from "react";
import { formatTime } from "../utils/format";
import SpeakerAvatar from "./SpeakerAvatar";

/**
 * Single caption message component
 */
export default function CaptionMessage({ caption, speakerColor, avatarUrl, searchQuery }) {
  // Highlight search query in text
  const highlightText = (text) => {
    if (!searchQuery) return text;

    const parts = text.split(new RegExp(`(${escapeRegex(searchQuery)})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i}>{part}</mark>
      ) : (
        part
      )
    );
  };

  const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  return (
    <div className="caption-message" data-caption-id={caption.captionId} data-speaker={caption.speaker}>
      <div className="caption-header">
        <SpeakerAvatar
          speaker={caption.speaker}
          colorIndex={speakerColor}
          avatarUrl={avatarUrl}
        />
        <span className="speaker-name">{caption.speaker}</span>
        <span className="caption-time">{formatTime(caption.timestamp)}</span>
      </div>
      <div className="caption-text">{highlightText(caption.text)}</div>
    </div>
  );
}
