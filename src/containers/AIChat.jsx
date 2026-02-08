import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="M8 10h.01M12 10h.01M16 10h.01" />
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
              <div className="ai-chat-message-avatar">
                {msg.role === "user" ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a4 4 0 0 1 4 4v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V6a4 4 0 0 1 4-4z" />
                    <rect x="8" y="8" width="8" height="8" rx="1" />
                    <path d="M8 12H5a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h3M16 12h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3" />
                    <path d="M10 16v4M14 16v4M9 20h6" />
                  </svg>
                )}
              </div>
              <div className="ai-chat-message-content">
                <div className="ai-chat-message-role">
                  {msg.role === "user" ? "You" : "AI"}
                </div>
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
                {/* Action buttons for assistant messages with content */}
                {msg.role === "assistant" && msg.content && (
                  <div className="ai-chat-actions">
                    <button
                      className={`ai-chat-action-btn ${copiedId === msg.id ? "ai-chat-action-btn-active" : ""}`}
                      onClick={() => handleCopy(msg)}
                      title="Copy to clipboard"
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
                      <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                    </button>
                    <button
                      className="ai-chat-action-btn"
                      onClick={() => handleSlack(msg)}
                      title={slackWebhookUrl ? "Send to Slack" : "Configure Slack in Settings"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 2a2.5 2.5 0 0 0 0 5H17V4.5A2.5 2.5 0 0 0 14.5 2z" />
                        <path d="M7 5.5A2.5 2.5 0 0 0 9.5 8H12V5.5A2.5 2.5 0 0 0 9.5 3 2.5 2.5 0 0 0 7 5.5z" />
                        <path d="M17 9.5A2.5 2.5 0 0 0 14.5 12H12V9.5a2.5 2.5 0 0 1 5 0z" />
                        <path d="M7 14.5A2.5 2.5 0 0 0 9.5 17V19.5A2.5 2.5 0 0 0 12 17h0a2.5 2.5 0 0 0-2.5-2.5H7z" />
                      </svg>
                      <span>Slack</span>
                    </button>
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
