import React, { useState, useEffect } from "react";
import { formatDuration } from "../utils/format";

/**
 * Footer component showing caption count and duration timer
 */
export default function Footer({ captionCount, startTime }) {
  const [duration, setDuration] = useState("0:00");

  useEffect(() => {
    if (!startTime) {
      setDuration("0:00");
      return;
    }

    const interval = setInterval(() => {
      setDuration(formatDuration(Date.now() - startTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <footer className="footer">
      <span>{captionCount === 1 ? "1 message" : `${captionCount} messages`}</span>
      <span className="footer-divider">•</span>
      <span>{duration}</span>
    </footer>
  );
}
