import React, { useState, useEffect } from "react";

/**
 * Search bar component with debounced input
 */
export default function SearchBar({ onSearchChange }) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      onSearchChange(query.trim());
    }, 200);

    return () => clearTimeout(debounceTimer);
  }, [query, onSearchChange]);

  return (
    <div className="search-bar">
      <svg
        className="search-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        className="search-input"
        placeholder="Search captions..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search captions"
      />
    </div>
  );
}
