import React from "react";

/**
 * Floating scroll to bottom button shown when user has scrolled up
 */
export default function ScrollToBottom({ newMessageCount, onClick }) {
  if (newMessageCount === 0) return null;

  return (
    <button className="scroll-bottom-btn" onClick={onClick}>
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
      <span>
        {newMessageCount === 1 ? "1 new message" : `${newMessageCount} new messages`}
      </span>
    </button>
  );
}
