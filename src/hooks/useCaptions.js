import { useState, useEffect, useCallback, useRef } from "react";
import { MESSAGE_TYPES, SPEAKER_COLORS } from "../constants";

/**
 * Custom hook for managing captions state and chrome.runtime communication
 */
export function useCaptions() {
  const [captions, setCaptions] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [hideMeetCaptions, setHideMeetCaptions] = useState(false);
  const [isImported, setIsImported] = useState(false);

  // Speaker color tracking (refs — don't need re-render)
  const speakerColorsRef = useRef({});
  const speakerColorIndexRef = useRef(0);

  // Avatar URLs as state — triggers re-render when new avatars are discovered
  const [speakerAvatarUrls, setSpeakerAvatarUrls] = useState({});

  // Get consistent color for a speaker
  const getSpeakerColor = useCallback((speaker) => {
    if (!speakerColorsRef.current[speaker]) {
      speakerColorsRef.current[speaker] = speakerColorIndexRef.current % SPEAKER_COLORS.length;
      speakerColorIndexRef.current++;
    }
    return speakerColorsRef.current[speaker];
  }, []);

  // Add or update a caption (using captionId to update in place)
  const addOrUpdateCaption = useCallback((captionData) => {
    setCaptions((prev) => {
      const captionId = captionData.captionId;
      const existingIdx = prev.findIndex((c) => c.captionId === captionId);

      if (existingIdx >= 0) {
        // Update existing caption in place
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          text: captionData.text,
          timestamp: captionData.timestamp,
          avatarUrl: captionData.avatarUrl || updated[existingIdx].avatarUrl,
        };
        return updated;
      } else {
        // Add new caption
        return [...prev, captionData];
      }
    });

    // Track avatar URL — update state so React re-renders with the image
    if (captionData.avatarUrl) {
      setSpeakerAvatarUrls((prev) => {
        if (prev[captionData.speaker] === captionData.avatarUrl) return prev;
        return { ...prev, [captionData.speaker]: captionData.avatarUrl };
      });
    }

    if (!startTime) {
      setStartTime(captionData.timestamp);
    }
    setEndTime(null); // New caption = meeting is active, clear any frozen timer
    setIsCapturing(true);
    setIsImported(false); // Live captions override imported state
  }, [startTime]);

  // Restore captions from an imported file
  const restoreCaptions = useCallback((importedCaptions, meta) => {
    // Replace local state
    setCaptions(importedCaptions);
    setMeetingTitle(meta.meetingTitle || "Imported Transcript");
    setMeetingUrl(meta.meetingUrl || "");
    setStartTime(importedCaptions[0]?.timestamp || Date.now());
    setEndTime(Date.now()); // Mark as ended (not live)
    setIsCapturing(false);
    setIsImported(true);

    // Reset speaker tracking and rebuild from imported data
    speakerColorsRef.current = {};
    speakerColorIndexRef.current = 0;
    setSpeakerAvatarUrls({});
    importedCaptions.forEach((caption) => {
      if (caption.speaker) {
        getSpeakerColor(caption.speaker);
      }
    });

    // Persist to background storage
    if (typeof chrome !== "undefined" && chrome?.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.RESTORE_CAPTIONS,
          captions: importedCaptions,
          meetingTitle: meta.meetingTitle || "Imported Transcript",
          meetingUrl: meta.meetingUrl || "",
        });
      } catch (error) {
        console.error("Failed to send RESTORE_CAPTIONS:", error);
      }
    }
  }, [getSpeakerColor]);

  // Clear all captions (caller handles confirmation)
  const clearCaptions = useCallback(() => {
    if (captions.length === 0) return;

    setCaptions([]);
    setIsCapturing(false);
    setIsImported(false);
    setStartTime(null);
    setEndTime(null);
    speakerColorsRef.current = {};
    speakerColorIndexRef.current = 0;
    setSpeakerAvatarUrls({});

    if (typeof chrome !== "undefined" && chrome?.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.CLEAR_CAPTIONS });
      } catch (error) {
        console.error("Failed to send CLEAR_CAPTIONS:", error);
      }
    }
  }, [captions.length]);

  // Toggle Meet captions visibility
  const toggleMeetCaptions = useCallback(() => {
    const newHide = !hideMeetCaptions;
    setHideMeetCaptions(newHide);

    if (typeof chrome !== "undefined" && chrome?.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.TOGGLE_MEET_CAPTIONS,
          hide: newHide,
        });
      } catch (error) {
        console.error("Failed to send TOGGLE_MEET_CAPTIONS:", error);
      }
    }
  }, [hideMeetCaptions]);

  // Load persisted captions on mount
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome?.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_CAPTIONS }, (response) => {
          if (response) {
            setMeetingTitle(response.meetingTitle || "");
            setMeetingUrl(response.meetingUrl || "");

            // Restore endTime (frozen timer) if the meeting ended previously
            if (response.endTime) {
              setEndTime(response.endTime);
            }

            if (response.captions && response.captions.length > 0) {
              setCaptions(response.captions);
              setStartTime(response.captions[0].timestamp);
              setIsCapturing(!response.endTime); // Not capturing if meeting already ended

              // Restore speaker colors and avatars
              const avatarMap = {};
              response.captions.forEach((caption) => {
                if (caption.speaker) {
                  getSpeakerColor(caption.speaker);
                }
                if (caption.avatarUrl) {
                  avatarMap[caption.speaker] = caption.avatarUrl;
                }
              });
              if (Object.keys(avatarMap).length > 0) {
                setSpeakerAvatarUrls(avatarMap);
              }
            }
          }
        });
      } catch (error) {
        console.error("Failed to get captions:", error);
      }
    }
  }, [getSpeakerColor]);

  // Listen for chrome.runtime messages
  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome?.runtime?.onMessage) return;

    const listener = (message) => {
      // Listen for CAPTION_UPDATE_RELAY (sent by background with composite
      // captionId), NOT the raw CAPTION_UPDATE from the content script.
      // The content script's message also reaches the side panel, but it
      // has a raw captionId that would cause duplicates.
      if (message.type === "CAPTION_UPDATE_RELAY") {
        addOrUpdateCaption(message.data);
      }

      if (message.type === MESSAGE_TYPES.MEETING_CHANGED) {
        // Meeting changed — only update metadata, keep all captions.
        // Captions are only cleared when the user explicitly clicks "Clear All".
        setMeetingTitle(message.title || "");
        setMeetingUrl(message.meetingUrl || "");
        // New meeting started → clear endTime so timer ticks again
        setEndTime(null);
        setIsCapturing(true);
      }

      if (message.type === MESSAGE_TYPES.MEETING_ENDED) {
        // Meeting ended — freeze the timer and stop the capturing indicator
        setEndTime(message.endTime || Date.now());
        setIsCapturing(false);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      if (chrome?.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(listener);
      }
    };
  }, [addOrUpdateCaption]);

  // ============================================================
  // Backup sync via chrome.storage.session.onChanged
  //
  // When the user switches to another browser tab, Chrome may
  // throttle or drop chrome.runtime.sendMessage broadcasts to
  // extension pages (like this side panel). However,
  // chrome.storage.session writes from the background still
  // trigger onChanged reliably in all extension contexts.
  //
  // We use this as a fallback: whenever storage changes, we
  // re-sync captions and metadata from storage, ensuring the
  // side panel stays up-to-date even when the Meet tab is
  // not the active tab.
  // ============================================================
  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome?.storage?.session?.onChanged) return;

    const storageListener = (changes) => {
      // Captions changed in storage — re-sync
      if (changes.captions) {
        const newCaptions = changes.captions.newValue || [];
        if (newCaptions.length > 0) {
          setCaptions(newCaptions);

          // Update capturing state — if endTime not set, still capturing
          if (!changes.endTime?.newValue) {
            setIsCapturing(true);
          }

          // Update start time from first caption
          if (!startTime && newCaptions[0]?.timestamp) {
            setStartTime(newCaptions[0].timestamp);
          }

          // Rebuild speaker colors/avatars for any new speakers
          const avatarMap = {};
          newCaptions.forEach((caption) => {
            if (caption.speaker) {
              getSpeakerColor(caption.speaker);
            }
            if (caption.avatarUrl) {
              avatarMap[caption.speaker] = caption.avatarUrl;
            }
          });
          if (Object.keys(avatarMap).length > 0) {
            setSpeakerAvatarUrls((prev) => {
              const merged = { ...prev, ...avatarMap };
              // Only update if something actually changed
              const changed = Object.keys(avatarMap).some(k => prev[k] !== avatarMap[k]);
              return changed ? merged : prev;
            });
          }
        }
      }

      // Meeting metadata changed
      if (changes.meetingTitle) {
        setMeetingTitle(changes.meetingTitle.newValue || "");
      }
      if (changes.meetingUrl) {
        setMeetingUrl(changes.meetingUrl.newValue || "");
      }

      // Meeting ended
      if (changes.endTime && changes.endTime.newValue) {
        setEndTime(changes.endTime.newValue);
        setIsCapturing(false);
      }
      // Meeting started (endTime cleared)
      if (changes.endTime && changes.endTime.newValue === null && changes.endTime.oldValue) {
        setEndTime(null);
        setIsCapturing(true);
      }
    };

    chrome.storage.session.onChanged.addListener(storageListener);
    return () => {
      if (chrome?.storage?.session?.onChanged) {
        chrome.storage.session.onChanged.removeListener(storageListener);
      }
    };
  }, [getSpeakerColor, startTime]);

  return {
    captions,
    isCapturing,
    isImported,
    meetingTitle,
    meetingUrl,
    startTime,
    endTime,
    hideMeetCaptions,
    clearCaptions,
    restoreCaptions,
    toggleMeetCaptions,
    getSpeakerColor,
    speakerAvatarUrls,
  };
}
