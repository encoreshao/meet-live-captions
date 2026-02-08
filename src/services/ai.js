/**
 * AI Service — unified interface for OpenAI, Claude, DeepSeek, and Gemini.
 *
 * Provides two main functions:
 *   fetchModels(providerId, apiKey) → [{ id, name }]
 *   streamChat(providerId, apiKey, model, messages, onChunk, signal) → void
 *
 * Each provider has its own adapter for request/response format differences.
 */

// ─── Helpers ────────────────────────────────────────────────────────

/** Only keep models created within the last 2 years, then cap at 20. */
const MAX_MODELS = 20;
const TWO_YEARS_AGO = Math.floor(Date.now() / 1000) - 2 * 365 * 24 * 60 * 60;

/** Exclude non-text-chat models (image, tts, audio, embedding, vision-only, etc.) */
const EXCLUDED_KEYWORDS = [
  "dall-e", "tts", "whisper", "embedding", "moderation",
  "audio", "image", "vision", "realtime", "transcription",
  "search", "instruct",
];

function isTextChatModel(id) {
  const lower = id.toLowerCase();
  return !EXCLUDED_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── Provider Adapters ───────────────────────────────────────────────

const adapters = {
  // ─── OpenAI ──────────────────────────────────────────────────────
  openai: {
    modelsUrl: "https://api.openai.com/v1/models",
    chatUrl: "https://api.openai.com/v1/chat/completions",

    headers(apiKey) {
      return {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
    },

    filterModels(data) {
      const prefixes = ["gpt-4", "gpt-3.5", "o1", "o3", "o4", "chatgpt"];
      return (data.data || [])
        .filter((m) => prefixes.some((p) => m.id.startsWith(p)))
        .filter((m) => isTextChatModel(m.id))
        .filter((m) => !m.created || m.created >= TWO_YEARS_AGO)
        .map((m) => ({ id: m.id, name: m.id, created: m.created || 0 }))
        .sort((a, b) => b.created - a.created)
        .slice(0, MAX_MODELS)
        .map(({ id, name }) => ({ id, name }));
    },

    buildBody(model, messages) {
      return { model, messages, stream: true };
    },

    parseSSE(line) {
      if (line === "data: [DONE]") return { done: true };
      if (!line.startsWith("data: ")) return null;
      try {
        const json = JSON.parse(line.slice(6));
        return { done: false, content: json.choices?.[0]?.delta?.content || "" };
      } catch {
        return null;
      }
    },
  },

  // ─── Claude / Anthropic ──────────────────────────────────────────
  claude: {
    modelsUrl: "https://api.anthropic.com/v1/models",
    chatUrl: "https://api.anthropic.com/v1/messages",

    headers(apiKey) {
      return {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "Content-Type": "application/json",
      };
    },

    filterModels(data) {
      return (data.data || [])
        .filter((m) => m.id.includes("claude"))
        .filter((m) => isTextChatModel(m.id))
        .filter((m) => !m.created_at || new Date(m.created_at).getTime() / 1000 >= TWO_YEARS_AGO)
        .map((m) => ({ id: m.id, name: m.id, ts: m.created_at ? new Date(m.created_at).getTime() : 0 }))
        .sort((a, b) => b.ts - a.ts)
        .slice(0, MAX_MODELS)
        .map(({ id, name }) => ({ id, name }));
    },

    buildBody(model, messages) {
      const systemMsg = messages.find((m) => m.role === "system");
      const chatMsgs = messages.filter((m) => m.role !== "system");
      const body = { model, messages: chatMsgs, max_tokens: 4096, stream: true };
      if (systemMsg) body.system = systemMsg.content;
      return body;
    },

    parseSSE(line) {
      if (!line.startsWith("data: ")) return null;
      try {
        const json = JSON.parse(line.slice(6));
        if (json.type === "message_stop") return { done: true };
        if (json.type === "content_block_delta") {
          return { done: false, content: json.delta?.text || "" };
        }
        return null;
      } catch {
        return null;
      }
    },
  },

  // ─── DeepSeek (OpenAI-compatible) ────────────────────────────────
  deepseek: {
    modelsUrl: "https://api.deepseek.com/models",
    chatUrl: "https://api.deepseek.com/chat/completions",

    headers(apiKey) {
      return {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
    },

    filterModels(data) {
      return (data.data || [])
        .filter((m) => isTextChatModel(m.id))
        .filter((m) => !m.created || m.created >= TWO_YEARS_AGO)
        .map((m) => ({ id: m.id, name: m.id, created: m.created || 0 }))
        .sort((a, b) => b.created - a.created)
        .slice(0, MAX_MODELS)
        .map(({ id, name }) => ({ id, name }));
    },

    buildBody(model, messages) {
      return { model, messages, stream: true };
    },

    parseSSE(line) {
      if (line === "data: [DONE]") return { done: true };
      if (!line.startsWith("data: ")) return null;
      try {
        const json = JSON.parse(line.slice(6));
        return { done: false, content: json.choices?.[0]?.delta?.content || "" };
      } catch {
        return null;
      }
    },
  },

  // ─── Gemini ──────────────────────────────────────────────────────
  gemini: {
    modelsUrl: "https://generativelanguage.googleapis.com/v1beta/models",

    chatUrl(model) {
      return `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;
    },

    headers(apiKey) {
      return {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      };
    },

    filterModels(data) {
      return (data.models || [])
        .filter((m) =>
          m.supportedGenerationMethods?.includes("generateContent")
        )
        .filter((m) => isTextChatModel(m.name))
        .map((m) => ({
          id: m.name.replace("models/", ""),
          name: m.displayName || m.name.replace("models/", ""),
        }))
        .slice(0, MAX_MODELS);
    },

    buildBody(_model, messages) {
      const systemMsg = messages.find((m) => m.role === "system");
      const chatMsgs = messages.filter((m) => m.role !== "system");
      const contents = chatMsgs.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      const body = { contents };
      if (systemMsg) {
        body.systemInstruction = { parts: [{ text: systemMsg.content }] };
      }
      return body;
    },

    parseSSE(line) {
      if (!line.startsWith("data: ")) return null;
      try {
        const json = JSON.parse(line.slice(6));
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (json.candidates?.[0]?.finishReason === "STOP" && !text) {
          return { done: true };
        }
        return { done: false, content: text };
      } catch {
        return null;
      }
    },
  },
};

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Fetch available models for a provider.
 * @param {string} providerId - "openai" | "claude" | "deepseek" | "gemini"
 * @param {string} apiKey - API key for the provider
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function fetchModels(providerId, apiKey) {
  const adapter = adapters[providerId];
  if (!adapter) throw new Error(`Unknown provider: ${providerId}`);
  if (!apiKey) throw new Error("API key is required");

  const res = await fetch(adapter.modelsUrl, {
    headers: adapter.headers(apiKey),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to fetch models (${res.status}): ${body}`);
  }

  const data = await res.json();
  return adapter.filterModels(data);
}

/**
 * Stream a chat completion.
 *
 * @param {string}   providerId - Provider key
 * @param {string}   apiKey     - API key
 * @param {string}   model      - Model ID
 * @param {Array}    messages   - [{ role, content }]
 * @param {Function} onChunk    - Called with each text chunk
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<void>} Resolves when stream ends
 */
export async function streamChat(providerId, apiKey, model, messages, onChunk, signal) {
  const adapter = adapters[providerId];
  if (!adapter) throw new Error(`Unknown provider: ${providerId}`);
  if (!apiKey) throw new Error("API key is required");

  const url = typeof adapter.chatUrl === "function"
    ? adapter.chatUrl(model)
    : adapter.chatUrl;

  const body = adapter.buildBody(model, messages);

  const res = await fetch(url, {
    method: "POST",
    headers: adapter.headers(apiKey),
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Chat request failed (${res.status}): ${errBody}`);
  }

  // Read SSE stream
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const parsed = adapter.parseSSE(trimmed);
      if (!parsed) continue;
      if (parsed.done) return;
      if (parsed.content) onChunk(parsed.content);
    }
  }

  // Process any remaining buffer
  if (buffer.trim()) {
    const parsed = adapter.parseSSE(buffer.trim());
    if (parsed && !parsed.done && parsed.content) {
      onChunk(parsed.content);
    }
  }
}
