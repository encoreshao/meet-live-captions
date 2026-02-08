import React from "react";

/**
 * Reusable toggle switch control.
 */
export default function Toggle({ id, checked, onChange }) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-slider" />
    </label>
  );
}
