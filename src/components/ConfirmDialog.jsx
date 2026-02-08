import React, { useEffect, useRef } from "react";

/**
 * In-panel confirmation dialog — replaces native confirm().
 * Renders as an overlay within the side panel.
 */
export default function ConfirmDialog({ open, message, onConfirm, onCancel }) {
  const confirmBtnRef = useRef(null);

  // Focus the confirm button when dialog opens
  useEffect(() => {
    if (open && confirmBtnRef.current) {
      confirmBtnRef.current.focus();
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onCancel();
  };

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn confirm-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="confirm-btn confirm-btn-confirm"
            onClick={handleConfirm}
            ref={confirmBtnRef}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
