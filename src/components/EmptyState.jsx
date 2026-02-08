import React from "react";

/**
 * Empty state component shown when no captions or no search results
 */
export default function EmptyState({ searchQuery }) {
  return (
    <div className="empty-state">
      <svg
        className="empty-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      {searchQuery ? (
        <>
          <h2 className="empty-title">No results</h2>
          <p className="empty-desc">
            No captions match "<strong>{searchQuery}</strong>"
          </p>
        </>
      ) : (
        <>
          <h2 className="empty-title">No captions yet</h2>
          <p className="empty-desc">
            Turn on live captions in Google Meet
            <br />
            <span className="empty-hint">
              Click CC button or press <kbd>c</kbd> in Meet
            </span>
          </p>
        </>
      )}
    </div>
  );
}
