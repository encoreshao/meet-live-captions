import React from "react";

/**
 * Floating scroll navigation — jump to top / jump to bottom icon buttons.
 * Appears on the right edge of the captions area when the user can scroll.
 */
export default function ScrollToBottom({ showTop, showBottom, newMessageCount, onTop, onBottom }) {
  if (!showTop && !showBottom) return null;

  return (
    <div className="scroll-nav">
      {showTop && (
        <button className="scroll-nav-btn" onClick={onTop} aria-label="Scroll to top">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}
      {showBottom && (
        <button className="scroll-nav-btn" onClick={onBottom} aria-label="Scroll to bottom">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {newMessageCount > 0 && (
            <span className="scroll-nav-badge">{newMessageCount > 99 ? "99+" : newMessageCount}</span>
          )}
        </button>
      )}
    </div>
  );
}
