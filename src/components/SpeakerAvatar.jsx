import React, { useState, useEffect } from "react";

/**
 * Speaker avatar component - shows image if available, falls back to colored circle with initial
 */
export default function SpeakerAvatar({ speaker, colorIndex, avatarUrl }) {
  const [imageError, setImageError] = useState(false);
  const [showImage, setShowImage] = useState(false);

  const getSpeakerInitial = (speaker) => {
    if (!speaker || speaker === "Unknown" || speaker === "Participant") return "?";
    return speaker.charAt(0).toUpperCase();
  };

  // Reset error state when avatarUrl changes
  useEffect(() => {
    if (avatarUrl) {
      setImageError(false);
      setShowImage(false);
    }
  }, [avatarUrl]);

  const handleImageError = () => {
    setImageError(true);
    setShowImage(false);
  };

  const handleImageLoad = () => {
    setShowImage(true);
  };

  return (
    <div className={`speaker-avatar speaker-color-${colorIndex}`}>
      {avatarUrl && !imageError ? (
        <>
          <img
            className="speaker-avatar-img"
            src={avatarUrl}
            alt={speaker}
            onError={handleImageError}
            onLoad={handleImageLoad}
            style={{ display: showImage ? "block" : "none" }}
          />
          <div
            className="speaker-avatar-fallback"
            style={{ display: showImage ? "none" : "flex" }}
          >
            {getSpeakerInitial(speaker)}
          </div>
        </>
      ) : (
        <div className="speaker-avatar-fallback">{getSpeakerInitial(speaker)}</div>
      )}
    </div>
  );
}
