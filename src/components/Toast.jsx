import React, { useEffect } from "react";

/**
 * Toast notification component
 */
export default function Toast({ message }) {
  useEffect(() => {
    if (!message) return;

    // Auto-hide after animation completes
    const timer = setTimeout(() => {
      // Toast will be removed by parent when message becomes null
    }, 2000);

    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return <div className={`toast ${message ? "show" : ""}`}>{message}</div>;
}
