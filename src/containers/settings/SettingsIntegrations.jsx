import React from "react";
import { AI_PROVIDERS } from "../../constants";
import SettingsSection from "../../components/settings/SettingsSection";
import SettingsRow from "../../components/settings/SettingsRow";
import SecretInput from "../../components/settings/SecretInput";

/**
 * Integrations settings tab — AI Provider API keys + Slack config.
 */
export default function SettingsIntegrations({ settings, updateSetting }) {
  return (
    <>
      {/* ── AI Providers ───────────────────── */}
      <SettingsSection
        title="AI Providers"
        description="Add API keys to enable the AI Assistant. Only providers with keys will appear in the chat."
      >
        {Object.values(AI_PROVIDERS).map((provider) => (
          <SettingsRow
            key={provider.id}
            label={provider.name}
            htmlFor={`setting-${provider.settingsKey}`}
            stacked
          >
            <SecretInput
              id={`setting-${provider.settingsKey}`}
              value={settings[provider.settingsKey] || ""}
              onChange={(v) => updateSetting(provider.settingsKey, v)}
              placeholder={provider.placeholder}
            />
          </SettingsRow>
        ))}
      </SettingsSection>

      {/* ── Slack ──────────────────────────── */}
      <SettingsSection
        title="Slack"
        description="Add an Incoming Webhook URL to send AI responses directly to a Slack channel."
      >
        <SettingsRow label="Webhook URL" htmlFor="setting-slack-webhook" stacked>
          <SecretInput
            id="setting-slack-webhook"
            value={settings.slackWebhookUrl || ""}
            onChange={(v) => updateSetting("slackWebhookUrl", v)}
            placeholder="https://hooks.slack.com/services/..."
          />
        </SettingsRow>
        <SettingsRow label="Channel Name" htmlFor="setting-slack-channel">
          <input
            id="setting-slack-channel"
            type="text"
            className="settings-api-key-input settings-text-input"
            value={settings.slackChannelName || ""}
            onChange={(e) => updateSetting("slackChannelName", e.target.value)}
            placeholder="#general"
            autoComplete="off"
          />
        </SettingsRow>
      </SettingsSection>
    </>
  );
}
