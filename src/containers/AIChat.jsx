import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Tooltip from "../components/Tooltip";

/**
 * AI Chat component — ChatGPT-style interface with provider/model selection,
 * streaming markdown responses, copy/Slack actions, and quick prompts.
 */
export default function AIChat({
  messages,
  isLoading,
  models,
  modelsLoading,
  selectedProvider,
  selectedModel,
  error,
  includeContext,
  availableProviders,
  hasCaptions,
  slackWebhookUrl,
  onSend,
  onStop,
  onClear,
  onProviderChange,
  onModelChange,
  onContextToggle,
  onRefreshModels,
  onBack,
  onShowToast,
}) {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e?.preventDefault();
      if (!input.trim() || isLoading) return;
      onSend(input);
      setInput("");
    },
    [input, isLoading, onSend]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // Auto-grow textarea height whenever input changes
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  // Quick prompt → auto-send immediately
  const handleQuickPrompt = useCallback(
    (text) => {
      if (isLoading) return;
      onSend(text);
    },
    [isLoading, onSend]
  );

  // Copy message text to clipboard
  const handleCopy = useCallback(
    async (msg) => {
      try {
        await navigator.clipboard.writeText(msg.content);
        setCopiedId(msg.id);
        setTimeout(() => setCopiedId(null), 2000);
        onShowToast?.("Copied to clipboard");
      } catch {
        onShowToast?.("Failed to copy");
      }
    },
    [onShowToast]
  );

  // Send message to Slack via webhook
  const handleSlack = useCallback(
    async (msg) => {
      if (!slackWebhookUrl) {
        onShowToast?.("Configure Slack webhook in Settings → Integrations");
        return;
      }
      try {
        const res = await fetch(slackWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: msg.content }),
        });
        if (res.ok) {
          onShowToast?.("Sent to Slack");
        } else {
          onShowToast?.("Slack send failed");
        }
      } catch {
        onShowToast?.("Slack send failed");
      }
    },
    [slackWebhookUrl, onShowToast]
  );

  // No API keys configured
  if (availableProviders.length === 0) {
    return (
      <div className="ai-chat">
        <div className="ai-chat-header">
          <button className="settings-back-btn" onClick={onBack} aria-label="Back to captions">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 className="ai-chat-title">AI Assistant</h2>
        </div>
        <div className="ai-chat-empty">
          <div className="ai-chat-empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3c0 4.5-4.5 9-9 9 4.5 0 9 4.5 9 9 0-4.5 4.5-9 9-9-4.5 0-9-4.5-9-9z" />
              <path d="M20 2v4" />
              <path d="M18 4h4" />
            </svg>
          </div>
          <p className="ai-chat-empty-title">No API Keys Configured</p>
          <p className="ai-chat-empty-desc">
            Go to <strong>Settings → Integrations</strong> to add your API key for OpenAI, Claude, DeepSeek, or Gemini.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-chat">
      {/* Header */}
      <div className="ai-chat-header">
        <button className="settings-back-btn" onClick={onBack} aria-label="Back to captions">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="ai-chat-title">AI Assistant</h2>
        <div className="ai-chat-header-actions">
          {messages.length > 0 && (
            <button className="icon-btn icon-btn-danger" onClick={onClear} aria-label="Clear chat" title="Clear chat">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Toolbar: Provider + Model selectors */}
      <div className="ai-chat-toolbar">
        <div className="ai-chat-selectors">
          <select
            className="ai-chat-select"
            value={selectedProvider}
            onChange={(e) => onProviderChange(e.target.value)}
          >
            {availableProviders.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            className="ai-chat-select ai-chat-select-model"
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={modelsLoading || models.length === 0}
          >
            {modelsLoading ? (
              <option>Loading models...</option>
            ) : models.length === 0 ? (
              <option>No models</option>
            ) : (
              models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))
            )}
          </select>

          <button
            className="ai-chat-refresh-btn"
            onClick={onRefreshModels}
            disabled={modelsLoading}
            title="Refresh models"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={modelsLoading ? "spinning" : ""}>
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>

        {hasCaptions && (
          <label className="ai-chat-context-toggle" title="Include meeting captions as context for AI">
            <input
              type="checkbox"
              checked={includeContext}
              onChange={(e) => onContextToggle(e.target.checked)}
            />
            <span className="ai-chat-context-label">Meeting context</span>
          </label>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="ai-chat-error">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Messages */}
      <div className="ai-chat-messages">
        {messages.length === 0 ? (
          <div className="ai-chat-welcome">
            <p className="ai-chat-welcome-text">
              Ask me anything about your meeting — summarize, translate, find action items, or chat freely.
            </p>
            <div className="ai-chat-suggestions">
              {[
                "Summarize the meeting so far",
                "List the key action items",
                "What were the main topics discussed?",
                "Translate the last few messages to Chinese",
              ].map((text) => (
                <button
                  key={text}
                  className="ai-chat-suggestion"
                  onClick={() => handleQuickPrompt(text)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ai-chat-suggestion-icon">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  {text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`ai-chat-message ai-chat-message-${msg.role}`}>
              <div className="ai-chat-message-content">
                <div className="ai-chat-message-text">
                  {msg.role === "assistant" && msg.content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  ) : msg.content ? (
                    msg.content
                  ) : isLoading && msg.role === "assistant" ? (
                    <span className="ai-chat-typing">
                      <span /><span /><span />
                    </span>
                  ) : null}
                </div>
                {/* Action icons for assistant messages with content */}
                {msg.role === "assistant" && msg.content && (
                  <div className="ai-chat-actions">
                    <Tooltip text={copiedId === msg.id ? "Copied!" : "Copy"}>
                      <button
                        className={`ai-chat-action-btn ${copiedId === msg.id ? "ai-chat-action-btn-active" : ""}`}
                        onClick={() => handleCopy(msg)}
                        aria-label="Copy to clipboard"
                      >
                        {copiedId === msg.id ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        )}
                      </button>
                    </Tooltip>
                    <Tooltip text={slackWebhookUrl ? "Send to Slack" : "Configure Slack in Settings"}>
                      <button
                        className="ai-chat-action-btn"
                        onClick={() => handleSlack(msg)}
                        aria-label="Send to Slack"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="13" y="2" width="3" height="8" rx="1.5" />
                          <path d="M19 8.5A1.5 1.5 0 0 1 17.5 10H16" />
                          <rect x="8" y="14" width="3" height="8" rx="1.5" />
                          <path d="M5 15.5A1.5 1.5 0 0 1 6.5 14H8" />
                          <rect x="14" y="13" width="8" height="3" rx="1.5" />
                          <path d="M15.5 19A1.5 1.5 0 0 1 14 17.5V16" />
                          <rect x="2" y="8" width="8" height="3" rx="1.5" />
                          <path d="M8.5 5A1.5 1.5 0 0 1 10 6.5V8" />
                        </svg>
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="ai-chat-input-area">
        <form onSubmit={handleSubmit} className="ai-chat-input-form">
          <textarea
            ref={inputRef}
            className="ai-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the meeting..."
            rows={1}
            disabled={isLoading}
          />
          {isLoading ? (
            <button type="button" className="ai-chat-send-btn ai-chat-stop-btn" onClick={onStop} aria-label="Stop">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button type="submit" className="ai-chat-send-btn" disabled={!input.trim()} aria-label="Send">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
