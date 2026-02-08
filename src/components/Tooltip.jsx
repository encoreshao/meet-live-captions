import React, { useState } from "react";

/**
 * Lightweight tooltip wrapper — shows text label on hover.
 * Renders below the child element by default.
 */
export default function Tooltip({ text, children }) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="tooltip-wrapper"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && <span className="tooltip-text">{text}</span>}
    </div>
  );
}
