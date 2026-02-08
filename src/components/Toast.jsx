import React from "react";

/**
 * Toast notification component with success checkmark icon.
 * Adapts colors automatically via CSS variables for light/dark themes.
 */
export default function Toast({ message }) {
  if (!message) return null;

  return (
    <div className="toast show">
      <svg
        className="toast-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {message}
    </div>
  );
}
