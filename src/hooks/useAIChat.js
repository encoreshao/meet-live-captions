import { useState, useCallback, useRef, useEffect } from "react";
import { AI_PROVIDERS } from "../constants";
import { fetchModels, streamChat } from "../services/ai";

/**
 * Custom hook for AI chat state management.
 *
 * Manages messages, provider/model selection, model list fetching,
 * streaming responses, and meeting-context injection.
 *
 * @param {object} settings - Current app settings (contains API keys)
 * @param {Array}  captions - Current captions array for context injection
 */
export function useAIChat(settings, captions) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [error, setError] = useState(null);
  const [includeContext, setIncludeContext] = useState(true);

  const abortRef = useRef(null);
  const modelsCache = useRef({}); // { providerId: [models] }

  // Get providers that have an API key configured
  const availableProviders = Object.values(AI_PROVIDERS).filter(
    (p) => settings[p.settingsKey]?.trim()
  );

  // Auto-select first available provider if none selected
  useEffect(() => {
    if (!selectedProvider && availableProviders.length > 0) {
      setSelectedProvider(availableProviders[0].id);
    }
    // If current provider's key was removed, switch to first available
    if (selectedProvider && !availableProviders.find((p) => p.id === selectedProvider)) {
      setSelectedProvider(availableProviders.length > 0 ? availableProviders[0].id : "");
    }
  }, [availableProviders.length, selectedProvider]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch models when provider changes
  useEffect(() => {
    if (!selectedProvider) {
      setModels([]);
      setSelectedModel("");
      return;
    }

    const apiKey = settings[AI_PROVIDERS[selectedProvider]?.settingsKey];
    if (!apiKey?.trim()) {
      setModels([]);
      setSelectedModel("");
      return;
    }

    // Check cache first
    if (modelsCache.current[selectedProvider]) {
      setModels(modelsCache.current[selectedProvider]);
      if (!modelsCache.current[selectedProvider].find((m) => m.id === selectedModel)) {
        setSelectedModel(modelsCache.current[selectedProvider][0]?.id || "");
      }
      return;
    }

    let cancelled = false;

    async function load() {
      setModelsLoading(true);
      setError(null);
      try {
        const result = await fetchModels(selectedProvider, apiKey);
        if (!cancelled) {
          modelsCache.current[selectedProvider] = result;
          setModels(result);
          setSelectedModel(result[0]?.id || "");
        }
      } catch (err) {
        if (!cancelled) {
          setError(`Failed to load models: ${err.message}`);
          setModels([]);
        }
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [selectedProvider, settings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh models (bypass cache)
  const refreshModels = useCallback(() => {
    if (selectedProvider) {
      delete modelsCache.current[selectedProvider];
      // Trigger re-fetch by updating a dummy state
      setModels([]);
      setModelsLoading(true);

      const apiKey = settings[AI_PROVIDERS[selectedProvider]?.settingsKey];
      if (!apiKey?.trim()) return;

      fetchModels(selectedProvider, apiKey)
        .then((result) => {
          modelsCache.current[selectedProvider] = result;
          setModels(result);
          if (!result.find((m) => m.id === selectedModel)) {
            setSelectedModel(result[0]?.id || "");
          }
        })
        .catch((err) => setError(`Failed to load models: ${err.message}`))
        .finally(() => setModelsLoading(false));
    }
  }, [selectedProvider, selectedModel, settings]);

  // Build system message with meeting context
  const buildSystemMessage = useCallback(() => {
    let systemContent =
      "You are a helpful AI assistant integrated into a Google Meet live captions extension. " +
      "You can help summarize discussions, answer questions about the meeting, generate action items, " +
      "translate content, or assist with any other task.";

    if (includeContext && captions && captions.length > 0) {
      // Include last 50 captions as context
      const recentCaptions = captions.slice(-50);
      const transcript = recentCaptions
        .map((c) => `[${c.speaker}]: ${c.text}`)
        .join("\n");
      systemContent +=
        "\n\nHere are the recent meeting captions for context:\n---\n" +
        transcript +
        "\n---\nUse this context to help answer the user's questions about the meeting.";
    }

    return { role: "system", content: systemContent };
  }, [includeContext, captions]);

  // Send a message
  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || !selectedProvider || !selectedModel || isLoading) return;

      const apiKey = settings[AI_PROVIDERS[selectedProvider]?.settingsKey];
      if (!apiKey?.trim()) {
        setError("API key not configured for this provider.");
        return;
      }

      setError(null);
      const userMessage = { role: "user", content: text.trim(), id: Date.now() };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Build messages array for API call
      const systemMsg = buildSystemMessage();
      const apiMessages = [
        systemMsg,
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: text.trim() },
      ];

      // Create assistant message placeholder
      const assistantId = Date.now() + 1;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", id: assistantId },
      ]);

      // Stream the response
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat(
          selectedProvider,
          apiKey,
          selectedModel,
          apiMessages,
          (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + chunk }
                  : m
              )
            );
          },
          controller.signal
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
          // Remove empty assistant message on error
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.id === assistantId && !last.content) {
              return prev.slice(0, -1);
            }
            return prev;
          });
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [selectedProvider, selectedModel, settings, messages, isLoading, buildSystemMessage]
  );

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsLoading(false);
    }
  }, []);

  // Clear chat
  const clearChat = useCallback(() => {
    stopStreaming();
    setMessages([]);
    setError(null);
  }, [stopStreaming]);

  // Change provider
  const changeProvider = useCallback((providerId) => {
    setSelectedProvider(providerId);
    setSelectedModel("");
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    models,
    modelsLoading,
    selectedProvider,
    selectedModel,
    error,
    includeContext,
    availableProviders,
    sendMessage,
    stopStreaming,
    clearChat,
    changeProvider,
    setSelectedModel,
    setIncludeContext,
    refreshModels,
  };
}
