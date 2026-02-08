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
  const [hideMeetCaptions, setHideMeetCaptions] = useState(false);

  // Speaker color and avatar tracking
  const speakerColorsRef = useRef({});
  const speakerColorIndexRef = useRef(0);
  const speakerAvatarUrlsRef = useRef({});

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

    // Track avatar URL
    if (captionData.avatarUrl) {
      speakerAvatarUrlsRef.current[captionData.speaker] = captionData.avatarUrl;
    }

    if (!startTime) {
      setStartTime(captionData.timestamp);
    }
    setIsCapturing(true);
  }, [startTime]);

  // Clear all captions
  const clearCaptions = useCallback(() => {
    if (captions.length === 0) return;

    if (!confirm("Clear all captured captions? This cannot be undone.")) return;

    setCaptions([]);
    setIsCapturing(false);
    setStartTime(null);
    speakerColorsRef.current = {};
    speakerColorIndexRef.current = 0;
    speakerAvatarUrlsRef.current = {};

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

            if (response.captions && response.captions.length > 0) {
              setCaptions(response.captions);
              setStartTime(response.captions[0].timestamp);
              setIsCapturing(true);

              // Restore speaker colors and avatars
              response.captions.forEach((caption) => {
                if (caption.speaker) {
                  getSpeakerColor(caption.speaker);
                }
                if (caption.avatarUrl) {
                  speakerAvatarUrlsRef.current[caption.speaker] = caption.avatarUrl;
                }
              });
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
      if (message.type === MESSAGE_TYPES.CAPTION_UPDATE) {
        addOrUpdateCaption(message.data);
      }

      if (message.type === MESSAGE_TYPES.MEETING_CHANGED) {
        // New meeting — reset everything
        setCaptions([]);
        setIsCapturing(false);
        setStartTime(null);
        setMeetingTitle(message.title || "");
        setMeetingUrl(message.meetingUrl || "");
        speakerColorsRef.current = {};
        speakerColorIndexRef.current = 0;
        speakerAvatarUrlsRef.current = {};
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      if (chrome?.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(listener);
      }
    };
  }, [addOrUpdateCaption]);

  return {
    captions,
    isCapturing,
    meetingTitle,
    meetingUrl,
    startTime,
    hideMeetCaptions,
    clearCaptions,
    toggleMeetCaptions,
    getSpeakerColor,
    speakerAvatarUrls: speakerAvatarUrlsRef.current,
  };
}
