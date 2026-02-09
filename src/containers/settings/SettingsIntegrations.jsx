import React, { useState, useCallback } from "react";
import { AI_PROVIDERS } from "../../constants";
import { testApiKey, testSlackWebhook } from "../../services/ai";
import SettingsSection from "../../components/settings/SettingsSection";
import SettingsRow from "../../components/settings/SettingsRow";
import SecretInput from "../../components/settings/SecretInput";

/**
 * Integrations settings tab — AI Provider API keys + Slack config.
 * Each provider and Slack webhook has a "Test" button for quick validation.
 */
export default function SettingsIntegrations({ settings, updateSetting }) {
  // Track test state per provider: { [providerId]: "idle" | "testing" | "success" | "error" }
  const [testStates, setTestStates] = useState({});
  const [testMessages, setTestMessages] = useState({});

  const handleTestApiKey = useCallback(async (provider) => {
    const apiKey = settings[provider.settingsKey]?.trim();
    if (!apiKey) {
      setTestStates((s) => ({ ...s, [provider.id]: "error" }));
      setTestMessages((s) => ({ ...s, [provider.id]: "No API key entered" }));
      return;
    }

    setTestStates((s) => ({ ...s, [provider.id]: "testing" }));
    setTestMessages((s) => ({ ...s, [provider.id]: "" }));

    const result = await testApiKey(provider.id, apiKey);

    if (result.ok) {
      setTestStates((s) => ({ ...s, [provider.id]: "success" }));
      setTestMessages((s) => ({ ...s, [provider.id]: `Connected — ${result.models} models` }));
    } else {
      setTestStates((s) => ({ ...s, [provider.id]: "error" }));
      setTestMessages((s) => ({ ...s, [provider.id]: result.error }));
    }
  }, [settings]);

  const handleTestSlack = useCallback(async () => {
    const url = settings.slackWebhookUrl?.trim();
    if (!url) {
      setTestStates((s) => ({ ...s, slack: "error" }));
      setTestMessages((s) => ({ ...s, slack: "No webhook URL entered" }));
      return;
    }

    setTestStates((s) => ({ ...s, slack: "testing" }));
    setTestMessages((s) => ({ ...s, slack: "" }));

    const result = await testSlackWebhook(url);

    if (result.ok) {
      setTestStates((s) => ({ ...s, slack: "success" }));
      setTestMessages((s) => ({ ...s, slack: "Message sent to Slack" }));
    } else {
      setTestStates((s) => ({ ...s, slack: "error" }));
      setTestMessages((s) => ({ ...s, slack: result.error }));
    }
  }, [settings.slackWebhookUrl]);

  return (
    <>
      {/* ── AI Providers ───────────────────── */}
      <SettingsSection
        title="AI Providers"
        description="Add API keys to enable the AI Assistant. Only providers with keys will appear in the chat."
      >
        {Object.values(AI_PROVIDERS).map((provider) => {
          const state = testStates[provider.id] || "idle";
          const message = testMessages[provider.id] || "";
          const hasKey = !!settings[provider.settingsKey]?.trim();

          return (
            <SettingsRow
              key={provider.id}
              label={provider.name}
              htmlFor={`setting-${provider.settingsKey}`}
              stacked
            >
              <div className="settings-test-row">
                <SecretInput
                  id={`setting-${provider.settingsKey}`}
                  value={settings[provider.settingsKey] || ""}
                  onChange={(v) => updateSetting(provider.settingsKey, v)}
                  placeholder={provider.placeholder}
                />
                <button
                  type="button"
                  className={`settings-test-btn ${state === "success" ? "settings-test-success" : ""} ${state === "error" ? "settings-test-error" : ""}`}
                  onClick={() => handleTestApiKey(provider)}
                  disabled={state === "testing"}
                  title={hasKey ? "Test API key" : "Enter an API key first"}
                >
                  {state === "testing" ? (
                    <svg className="spinning" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                  ) : state === "success" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : state === "error" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  ) : (
                    "Test"
                  )}
                </button>
              </div>
              {message && (
                <span className={`settings-test-message ${state === "success" ? "settings-test-message-success" : "settings-test-message-error"}`}>
                  {message}
                </span>
              )}
            </SettingsRow>
          );
        })}
      </SettingsSection>

      {/* ── Slack ──────────────────────────── */}
      <SettingsSection
        title="Slack"
        description="Add an Incoming Webhook URL to send AI responses directly to a Slack channel."
      >
        <SettingsRow label="Webhook URL" htmlFor="setting-slack-webhook" stacked>
          <div className="settings-test-row">
            <SecretInput
              id="setting-slack-webhook"
              value={settings.slackWebhookUrl || ""}
              onChange={(v) => updateSetting("slackWebhookUrl", v)}
              placeholder="https://hooks.slack.com/services/..."
            />
            <button
              type="button"
              className={`settings-test-btn ${testStates.slack === "success" ? "settings-test-success" : ""} ${testStates.slack === "error" ? "settings-test-error" : ""}`}
              onClick={handleTestSlack}
              disabled={testStates.slack === "testing"}
              title={settings.slackWebhookUrl?.trim() ? "Send test message" : "Enter a webhook URL first"}
            >
              {testStates.slack === "testing" ? (
                <svg className="spinning" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              ) : testStates.slack === "success" ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : testStates.slack === "error" ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                "Test"
              )}
            </button>
          </div>
          {testMessages.slack && (
            <span className={`settings-test-message ${testStates.slack === "success" ? "settings-test-message-success" : "settings-test-message-error"}`}>
              {testMessages.slack}
            </span>
          )}
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
