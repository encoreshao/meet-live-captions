import React from "react";
import { useSettings } from "../hooks/useSettings";

/**
 * Settings panel component with all configuration options
 */
export default function Settings({ onBack }) {
  const { settings, updateSetting, resetSettings } = useSettings();

  const handleReset = () => {
    if (!confirm("Reset all settings to defaults?")) return;
    resetSettings();
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={onBack} aria-label="Back to captions">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="settings-title">Settings</h2>
      </div>

      <div className="settings-body">
        {/* Appearance Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">Appearance</h3>

          <div className="settings-row">
            <label className="settings-label" htmlFor="setting-theme">
              Theme
            </label>
            <select
              id="setting-theme"
              className="settings-select"
              value={settings.theme}
              onChange={(e) => updateSetting("theme", e.target.value)}
            >
              <option value="auto">Auto</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="settings-row">
            <label className="settings-label" htmlFor="setting-font-size">
              Font Size
            </label>
            <select
              id="setting-font-size"
              className="settings-select"
              value={settings.fontSize}
              onChange={(e) => updateSetting("fontSize", e.target.value)}
            >
              <option value="12">12px</option>
              <option value="13">13px</option>
              <option value="14">14px</option>
              <option value="15">15px</option>
              <option value="16">16px</option>
            </select>
          </div>

          <div className="settings-row">
            <label className="settings-label" htmlFor="setting-compact">
              Compact Mode
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                id="setting-compact"
                checked={settings.compact}
                onChange={(e) => updateSetting("compact", e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        {/* Caption Behavior Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">Caption Behavior</h3>

          <div className="settings-row">
            <label className="settings-label" htmlFor="setting-auto-hide">
              Auto-hide Meet Captions
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                id="setting-auto-hide"
                checked={settings.autoHide}
                onChange={(e) => updateSetting("autoHide", e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="settings-row">
            <label className="settings-label" htmlFor="setting-auto-scroll">
              Auto-scroll to Bottom
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                id="setting-auto-scroll"
                checked={settings.autoScroll}
                onChange={(e) => updateSetting("autoScroll", e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="settings-row">
            <label className="settings-label" htmlFor="setting-merge-speaker">
              Merge Same Speaker
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                id="setting-merge-speaker"
                checked={settings.mergeSpeaker}
                onChange={(e) => updateSetting("mergeSpeaker", e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        {/* Export Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">Export</h3>

          <div className="settings-row">
            <label className="settings-label" htmlFor="setting-export-format">
              Format
            </label>
            <select
              id="setting-export-format"
              className="settings-select"
              value={settings.exportFormat}
              onChange={(e) => updateSetting("exportFormat", e.target.value)}
            >
              <option value="txt">TXT</option>
              <option value="srt">SRT</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <div className="settings-row">
            <label className="settings-label" htmlFor="setting-export-timestamps">
              Include Timestamps
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                id="setting-export-timestamps"
                checked={settings.exportTimestamps}
                onChange={(e) => updateSetting("exportTimestamps", e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="settings-row">
            <label className="settings-label" htmlFor="setting-export-speakers">
              Include Speakers
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                id="setting-export-speakers"
                checked={settings.exportSpeakers}
                onChange={(e) => updateSetting("exportSpeakers", e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">Notifications</h3>

          <div className="settings-row">
            <label className="settings-label" htmlFor="setting-sound">
              Sound Notifications
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                id="setting-sound"
                checked={settings.sound}
                onChange={(e) => updateSetting("sound", e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="settings-row">
            <label className="settings-label" htmlFor="setting-badge">
              Badge Count
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                id="setting-badge"
                checked={settings.badge}
                onChange={(e) => updateSetting("badge", e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        {/* Storage Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">Storage</h3>

          <div className="settings-row">
            <label className="settings-label" htmlFor="setting-auto-save">
              Auto-save Transcripts
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                id="setting-auto-save"
                checked={settings.autoSave}
                onChange={(e) => updateSetting("autoSave", e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="settings-row">
            <label className="settings-label" htmlFor="setting-max-captions">
              Max Captions
            </label>
            <select
              id="setting-max-captions"
              className="settings-select"
              value={settings.maxCaptions}
              onChange={(e) => updateSetting("maxCaptions", e.target.value)}
            >
              <option value="0">Unlimited</option>
              <option value="100">100</option>
              <option value="500">500</option>
              <option value="1000">1,000</option>
              <option value="5000">5,000</option>
            </select>
          </div>

          <div className="settings-row">
            <label className="settings-label" htmlFor="setting-clear-on-end">
              Clear on Meeting End
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                id="setting-clear-on-end"
                checked={settings.clearOnEnd}
                onChange={(e) => updateSetting("clearOnEnd", e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        {/* Accessibility Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">Accessibility</h3>

          <div className="settings-row">
            <label className="settings-label" htmlFor="setting-high-contrast">
              High Contrast
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                id="setting-high-contrast"
                checked={settings.highContrast}
                onChange={(e) => updateSetting("highContrast", e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="settings-row">
            <label className="settings-label" htmlFor="setting-reduced-motion">
              Reduced Motion
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                id="setting-reduced-motion"
                checked={settings.reducedMotion}
                onChange={(e) => updateSetting("reducedMotion", e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        {/* Reset */}
        <div className="settings-section settings-section-last">
          <button className="settings-reset-btn" onClick={handleReset}>
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
