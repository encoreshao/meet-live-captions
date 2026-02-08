import React, { useState, useEffect } from "react";
import { formatDuration } from "../utils/format";

/**
 * Footer component showing caption count and duration timer.
 *
 * When `endTime` is provided, the timer freezes at `endTime - startTime`.
 * Otherwise it ticks every second showing `Date.now() - startTime`.
 */
export default function Footer({ captionCount, startTime, endTime }) {
  const [duration, setDuration] = useState("0:00");

  useEffect(() => {
    if (!startTime) {
      setDuration("0:00");
      return;
    }

    // If the meeting has ended, show the frozen duration
    if (endTime) {
      setDuration(formatDuration(endTime - startTime));
      return; // No interval needed — duration is static
    }

    // Meeting is active — tick every second
    setDuration(formatDuration(Date.now() - startTime));
    const interval = setInterval(() => {
      setDuration(formatDuration(Date.now() - startTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, endTime]);

  return (
    <footer className="footer">
      <span>{captionCount === 1 ? "1 message" : `${captionCount} messages`}</span>
      <span className="footer-divider">•</span>
      <span>{duration}</span>
    </footer>
  );
}
