import React, { useState } from "react";
import { useSettings } from "../hooks/useSettings";
import SettingsAccount from "./settings/SettingsAccount";
import SettingsGeneral from "./settings/SettingsGeneral";
import SettingsIntegrations from "./settings/SettingsIntegrations";


/**
 * Settings panel — thin shell with header, tabs, and tab routing.
 */
export default function Settings({ onBack, onRequestConfirm }) {
  const { settings, updateSetting, resetSettings } = useSettings();
  const [activeTab, setActiveTab] = useState("account");

  const handleReset = () => {
    onRequestConfirm("Reset all settings to defaults?", () => {
      resetSettings();
    });
  };

  return (
    <div className="settings-panel">
      {/* Header */}
      <div className="settings-header">
        <button className="settings-back-btn" onClick={onBack} aria-label="Back to captions">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="settings-title">Settings</h2>
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === "account" ? "settings-tab-active" : ""}`}
          onClick={() => setActiveTab("account")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Account
        </button>
        <button
          className={`settings-tab ${activeTab === "general" ? "settings-tab-active" : ""}`}
          onClick={() => setActiveTab("general")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          General
        </button>
        <button
          className={`settings-tab ${activeTab === "integrations" ? "settings-tab-active" : ""}`}
          onClick={() => setActiveTab("integrations")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Integrations
        </button>
      </div>

      {/* Tab content */}
      <div className="settings-body">
        {activeTab === "account" ? (
          <SettingsAccount />
        ) : activeTab === "general" ? (
          <SettingsGeneral
            settings={settings}
            updateSetting={updateSetting}
            onReset={handleReset}
          />
        ) : (
          <SettingsIntegrations
            settings={settings}
            updateSetting={updateSetting}
          />
        )}
      </div>
    </div>
  );
}
