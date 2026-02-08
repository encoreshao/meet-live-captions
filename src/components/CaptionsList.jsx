import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import CaptionMessage from "./CaptionMessage";
import EmptyState from "./EmptyState";

/**
 * Scrollable captions list with auto-scroll support
 */
const CaptionsList = forwardRef(function CaptionsList(
  {
    captions,
    searchQuery,
    autoScroll,
    onScrollChange,
    getSpeakerColor,
    speakerAvatarUrls,
  },
  ref
) {
  const containerRef = useRef(null);
  const isUserScrollingRef = useRef(false);

  // Expose scrollToBottom method via ref
  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
        isUserScrollingRef.current = false;
        onScrollChange(true);
      }
    },
  }));

  // Filter captions based on search query
  const filteredCaptions = searchQuery
    ? captions.filter(
        (c) =>
          c.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.speaker.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : captions;

  // Auto-scroll to bottom when new captions arrive
  useEffect(() => {
    if (autoScroll && containerRef.current && !isUserScrollingRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [captions, autoScroll]);

  // Handle scroll detection
  const handleScroll = () => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 60;

    if (isNearBottom) {
      isUserScrollingRef.current = false;
      onScrollChange(true);
    } else {
      isUserScrollingRef.current = true;
      onScrollChange(false);
    }
  };

  return (
    <div className="captions-container" ref={containerRef} onScroll={handleScroll}>
      {filteredCaptions.length === 0 ? (
        <EmptyState searchQuery={searchQuery} />
      ) : (
        <div className="captions-list">
          {filteredCaptions.map((caption) => (
            <CaptionMessage
              key={caption.captionId}
              caption={caption}
              speakerColor={getSpeakerColor(caption.speaker)}
              avatarUrl={caption.avatarUrl || speakerAvatarUrls[caption.speaker] || null}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export default CaptionsList;
