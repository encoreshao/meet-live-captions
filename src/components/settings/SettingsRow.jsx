import React from "react";

/**
 * Reusable settings row — a label + control pair.
 * Use `stacked` for full-width controls (like API key inputs).
 */
export default function SettingsRow({ label, htmlFor, stacked, children }) {
  return (
    <div className={`settings-row${stacked ? " settings-row-stacked" : ""}`}>
      <label className="settings-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
