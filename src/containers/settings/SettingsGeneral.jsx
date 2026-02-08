import React from "react";
import SettingsSection from "../../components/settings/SettingsSection";
import SettingsRow from "../../components/settings/SettingsRow";
import Toggle from "../../components/settings/Toggle";

/**
 * General settings tab — Appearance, Captions, Export,
 * Notifications, Storage, Accessibility, and Reset.
 */
export default function SettingsGeneral({ settings, updateSetting, onReset }) {
  return (
    <>
      {/* ── Appearance ─────────────────────── */}
      <SettingsSection title="Appearance">
        <SettingsRow label="Theme" htmlFor="setting-theme">
          <select id="setting-theme" className="settings-select" value={settings.theme} onChange={(e) => updateSetting("theme", e.target.value)}>
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </SettingsRow>
        <SettingsRow label="Font Size" htmlFor="setting-font-size">
          <select id="setting-font-size" className="settings-select" value={settings.fontSize} onChange={(e) => updateSetting("fontSize", e.target.value)}>
            <option value="12">12px</option>
            <option value="13">13px</option>
            <option value="14">14px</option>
            <option value="15">15px</option>
            <option value="16">16px</option>
          </select>
        </SettingsRow>
        <SettingsRow label="Compact Mode" htmlFor="setting-compact">
          <Toggle id="setting-compact" checked={settings.compact} onChange={(v) => updateSetting("compact", v)} />
        </SettingsRow>
      </SettingsSection>

      {/* ── Caption Behavior ───────────────── */}
      <SettingsSection title="Caption Behavior">
        <SettingsRow label="Auto-hide Meet Captions" htmlFor="setting-auto-hide">
          <Toggle id="setting-auto-hide" checked={settings.autoHide} onChange={(v) => updateSetting("autoHide", v)} />
        </SettingsRow>
        <SettingsRow label="Auto-scroll to Bottom" htmlFor="setting-auto-scroll">
          <Toggle id="setting-auto-scroll" checked={settings.autoScroll} onChange={(v) => updateSetting("autoScroll", v)} />
        </SettingsRow>
        <SettingsRow label="Merge Same Speaker" htmlFor="setting-merge-speaker">
          <Toggle id="setting-merge-speaker" checked={settings.mergeSpeaker} onChange={(v) => updateSetting("mergeSpeaker", v)} />
        </SettingsRow>
      </SettingsSection>

      {/* ── Export ─────────────────────────── */}
      <SettingsSection title="Export">
        <SettingsRow label="Format" htmlFor="setting-export-format">
          <select id="setting-export-format" className="settings-select" value={settings.exportFormat} onChange={(e) => updateSetting("exportFormat", e.target.value)}>
            <option value="txt">TXT</option>
            <option value="srt">SRT</option>
            <option value="json">JSON</option>
          </select>
        </SettingsRow>
        <SettingsRow label="Include Timestamps" htmlFor="setting-export-timestamps">
          <Toggle id="setting-export-timestamps" checked={settings.exportTimestamps} onChange={(v) => updateSetting("exportTimestamps", v)} />
        </SettingsRow>
        <SettingsRow label="Include Speakers" htmlFor="setting-export-speakers">
          <Toggle id="setting-export-speakers" checked={settings.exportSpeakers} onChange={(v) => updateSetting("exportSpeakers", v)} />
        </SettingsRow>
      </SettingsSection>

      {/* ── Notifications ──────────────────── */}
      <SettingsSection title="Notifications">
        <SettingsRow label="Sound Notifications" htmlFor="setting-sound">
          <Toggle id="setting-sound" checked={settings.sound} onChange={(v) => updateSetting("sound", v)} />
        </SettingsRow>
        <SettingsRow label="Badge Count" htmlFor="setting-badge">
          <Toggle id="setting-badge" checked={settings.badge} onChange={(v) => updateSetting("badge", v)} />
        </SettingsRow>
      </SettingsSection>

      {/* ── Storage ────────────────────────── */}
      <SettingsSection title="Storage">
        <SettingsRow label="Auto-save Transcripts" htmlFor="setting-auto-save">
          <Toggle id="setting-auto-save" checked={settings.autoSave} onChange={(v) => updateSetting("autoSave", v)} />
        </SettingsRow>
        <SettingsRow label="Max Captions" htmlFor="setting-max-captions">
          <select id="setting-max-captions" className="settings-select" value={settings.maxCaptions} onChange={(e) => updateSetting("maxCaptions", e.target.value)}>
            <option value="0">Unlimited</option>
            <option value="100">100</option>
            <option value="500">500</option>
            <option value="1000">1,000</option>
            <option value="5000">5,000</option>
          </select>
        </SettingsRow>
        <SettingsRow label="Clear on Meeting End" htmlFor="setting-clear-on-end">
          <Toggle id="setting-clear-on-end" checked={settings.clearOnEnd} onChange={(v) => updateSetting("clearOnEnd", v)} />
        </SettingsRow>
      </SettingsSection>

      {/* ── Accessibility ──────────────────── */}
      <SettingsSection title="Accessibility">
        <SettingsRow label="High Contrast" htmlFor="setting-high-contrast">
          <Toggle id="setting-high-contrast" checked={settings.highContrast} onChange={(v) => updateSetting("highContrast", v)} />
        </SettingsRow>
        <SettingsRow label="Reduced Motion" htmlFor="setting-reduced-motion">
          <Toggle id="setting-reduced-motion" checked={settings.reducedMotion} onChange={(v) => updateSetting("reducedMotion", v)} />
        </SettingsRow>
      </SettingsSection>

      {/* ── Reset ──────────────────────────── */}
      <SettingsSection last>
        <button className="settings-reset-btn" onClick={onReset}>
          Reset to Defaults
        </button>
      </SettingsSection>
    </>
  );
}
