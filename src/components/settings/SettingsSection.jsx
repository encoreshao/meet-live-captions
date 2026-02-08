import React from "react";

/**
 * Reusable settings section wrapper with title and optional description.
 */
export default function SettingsSection({ title, description, last, children }) {
  return (
    <div className={`settings-section${last ? " settings-section-last" : ""}`}>
      {title && <h3 className="settings-section-title">{title}</h3>}
      {description && <p className="settings-section-desc">{description}</p>}
      {children}
    </div>
  );
}
