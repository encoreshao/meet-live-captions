import React from "react";
import Tooltip from "./Tooltip";

/**
 * Header component with brand, action buttons, and status indicator.
 * Hide/Download/Clear buttons only appear when captions data exists.
 */
export default function Header({
  isCapturing,
  hasCaptions,
  onSettingsClick,
  onChatClick,
  onHideCaptionsClick,
  hideMeetCaptions,
  onDownloadClick,
  onClearClick,
}) {
  return (
    <header className="header">
      <div className="header-top">
        <div className="header-brand">
          <svg
            className="header-icon"
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
          <h1 className="header-title">Meet Captions</h1>
        </div>
        <div className="header-actions">
          {/* AI Chat — always visible */}
          <Tooltip text="AI Assistant">
            <button
              className="icon-btn"
              onClick={onChatClick}
              aria-label="AI Assistant"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3c0 4.5-4.5 9-9 9 4.5 0 9 4.5 9 9 0-4.5 4.5-9 9-9-4.5 0-9-4.5-9-9z" />
                <path d="M20 2v4" />
                <path d="M18 4h4" />
              </svg>
            </button>
          </Tooltip>

          {/* Settings — always visible */}
          <Tooltip text="Settings">
            <button
              className="icon-btn"
              onClick={onSettingsClick}
              aria-label="Settings"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </Tooltip>

          {/* Hide / Download / Clear — only visible when captions exist */}
          {hasCaptions && (
            <>
              <Tooltip text={hideMeetCaptions ? "Show Meet overlay" : "Hide Meet overlay"}>
                <button
                  className={`icon-btn ${hideMeetCaptions ? "active" : ""}`}
                  onClick={onHideCaptionsClick}
                  aria-label={hideMeetCaptions ? "Show Meet captions" : "Hide Meet captions"}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                </button>
              </Tooltip>

              <Tooltip text="Download transcript">
                <button
                  className="icon-btn"
                  onClick={onDownloadClick}
                  aria-label="Download transcript"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </Tooltip>

              <Tooltip text="Clear all captions">
                <button
                  className="icon-btn icon-btn-danger"
                  onClick={onClearClick}
                  aria-label="Clear all captions"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </Tooltip>
            </>
          )}
        </div>
      </div>
      <div className="header-status">
        <div className={`status-dot ${isCapturing ? "active" : ""}`} />
        <span className="status-text">
          {isCapturing ? "Capturing captions..." : "Waiting for captions..."}
        </span>
      </div>
    </header>
  );
}
