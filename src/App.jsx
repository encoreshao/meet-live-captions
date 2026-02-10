import React, { useState, useEffect, useCallback, useRef } from "react";
import { SettingsProvider, useSettings } from "./hooks/useSettings";
import { useCaptions } from "./hooks/useCaptions";
import { useAIChat } from "./hooks/useAIChat";
import { useToast } from "./hooks/useToast";
import { useConfirm } from "./hooks/useConfirm";
import { downloadTranscript, parseTranscript } from "./utils/export";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import CaptionsList from "./containers/CaptionsList";
import ScrollToBottom from "./components/ScrollToBottom";
import Footer from "./components/Footer";
import Settings from "./containers/Settings";
import AIChat from "./containers/AIChat";
import Toast from "./components/Toast";
import ConfirmDialog from "./components/ConfirmDialog";

/**
 * Main app component - manages view state and coordinates all components
 */
function AppContent() {
  const [view, setView] = useState("captions"); // "captions" | "settings" | "chat"
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [isNearTop, setIsNearTop] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const captionsListRef = useRef(null);
  const prevCaptionsLengthRef = useRef(0);
  const fileInputRef = useRef(null);

  const { settings } = useSettings();
  const {
    captions,
    isCapturing,
    isImported,
    meetingTitle,
    meetingUrl,
    startTime,
    endTime,
    hideMeetCaptions,
    clearCaptions,
    restoreCaptions,
    toggleMeetCaptions,
    getSpeakerColor,
    speakerAvatarUrls,
  } = useCaptions();
  const aiChat = useAIChat(settings, captions);
  const { toast, showToast } = useToast();
  const { confirmState, requestConfirm, closeConfirm } = useConfirm();

  // Apply auto-scroll setting
  useEffect(() => {
    setAutoScroll(settings.autoScroll);
  }, [settings.autoScroll]);

  // Apply auto-hide setting
  useEffect(() => {
    if (settings.autoHide && !hideMeetCaptions) {
      toggleMeetCaptions();
    }
  }, [settings.autoHide]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enforce max captions limit (trim oldest if exceeded)
  useEffect(() => {
    const maxCaptions = parseInt(settings.maxCaptions) || 0;
    if (maxCaptions > 0 && captions.length > maxCaptions) {
      // Note: This would ideally be handled in useCaptions hook,
      // but for now we'll let it pass through. The background script
      // should handle persistence limits.
    }
  }, [captions.length, settings.maxCaptions]);

  // Track new messages when not auto-scrolling
  useEffect(() => {
    if (captions.length > prevCaptionsLengthRef.current && !autoScroll) {
      setNewMessageCount((prev) => prev + 1);
    }
    prevCaptionsLengthRef.current = captions.length;
  }, [captions.length, autoScroll]);

  const handleScrollChange = useCallback((isAutoScrolling, nearTop) => {
    setAutoScroll(isAutoScrolling);
    setIsNearTop(nearTop);
    if (isAutoScrolling) {
      setNewMessageCount(0);
    }
  }, []);

  const handleScrollToBottom = useCallback(() => {
    if (captionsListRef.current) {
      captionsListRef.current.scrollToBottom();
    }
    setAutoScroll(true);
    setNewMessageCount(0);
  }, []);

  const handleScrollToTop = useCallback(() => {
    if (captionsListRef.current) {
      captionsListRef.current.scrollToTop();
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (captions.length === 0) {
      showToast("No captions to download");
      return;
    }

    const success = downloadTranscript(
      captions,
      settings,
      { meetingTitle, meetingUrl, startTime }
    );

    if (success) {
      showToast("Transcript downloaded");
    }
  }, [captions, settings, meetingTitle, meetingUrl, startTime, showToast]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset input so the same file can be re-selected
      e.target.value = "";

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const { captions: parsed, meta } = parseTranscript(
            event.target.result,
            file.name
          );

          if (parsed.length === 0) {
            showToast("No captions found in file");
            return;
          }

          const doRestore = () => {
            restoreCaptions(parsed, meta);
            setView("captions");
            showToast(`Restored ${parsed.length} captions`);
          };

          if (captions.length > 0) {
            requestConfirm(
              "Replace current captions with imported data? This cannot be undone.",
              doRestore
            );
          } else {
            doRestore();
          }
        } catch (error) {
          console.error("Failed to parse transcript:", error);
          showToast(error.message || "Failed to parse file");
        }
      };

      reader.onerror = () => {
        showToast("Failed to read file");
      };

      reader.readAsText(file);
    },
    [captions.length, restoreCaptions, requestConfirm, showToast]
  );

  const handleClear = useCallback(() => {
    if (captions.length === 0) return;
    requestConfirm("Clear all captured captions? This cannot be undone.", () => {
      clearCaptions();
      showToast("Captions cleared");
    });
  }, [captions.length, requestConfirm, clearCaptions, showToast]);

  const handleSettingsClick = useCallback(() => {
    setView((prev) => (prev === "settings" ? "captions" : "settings"));
  }, []);

  const handleChatClick = useCallback(() => {
    setView((prev) => (prev === "chat" ? "captions" : "chat"));
  }, []);

  return (
    <>
      <Header
        isCapturing={isCapturing}
        hasCaptions={captions.length > 0}
        isImported={isImported}
        onSettingsClick={handleSettingsClick}
        onChatClick={handleChatClick}
        onHideCaptionsClick={toggleMeetCaptions}
        hideMeetCaptions={hideMeetCaptions}
        onDownloadClick={handleDownload}
        onUploadClick={handleUploadClick}
        onClearClick={handleClear}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.txt,.srt"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {view === "captions" ? (
        <>
          <SearchBar onSearchChange={setSearchQuery} />
          <CaptionsList
            ref={captionsListRef}
            captions={captions}
            searchQuery={searchQuery}
            autoScroll={autoScroll}
            onScrollChange={handleScrollChange}
            getSpeakerColor={getSpeakerColor}
            speakerAvatarUrls={speakerAvatarUrls}
          />
          <ScrollToBottom
            showTop={!autoScroll && !isNearTop}
            showBottom={!autoScroll}
            newMessageCount={newMessageCount}
            onTop={handleScrollToTop}
            onBottom={handleScrollToBottom}
          />
          <Footer captionCount={captions.length} startTime={startTime} endTime={endTime} />
        </>
      ) : view === "chat" ? (
        <AIChat
          messages={aiChat.messages}
          isLoading={aiChat.isLoading}
          models={aiChat.models}
          modelsLoading={aiChat.modelsLoading}
          selectedProvider={aiChat.selectedProvider}
          selectedModel={aiChat.selectedModel}
          error={aiChat.error}
          includeContext={aiChat.includeContext}
          availableProviders={aiChat.availableProviders}
          hasCaptions={captions.length > 0}
          slackWebhookUrl={settings.slackWebhookUrl}
          onSend={aiChat.sendMessage}
          onStop={aiChat.stopStreaming}
          onClear={aiChat.clearChat}
          onProviderChange={aiChat.changeProvider}
          onModelChange={aiChat.setSelectedModel}
          onContextToggle={aiChat.setIncludeContext}
          onRefreshModels={aiChat.refreshModels}
          onBack={() => setView("captions")}
          onShowToast={showToast}
        />
      ) : (
        <Settings onBack={() => setView("captions")} onRequestConfirm={requestConfirm} />
      )}

      <Toast message={toast} />
      <ConfirmDialog
        open={confirmState.open}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />
    </>
  );
}

/**
 * Root App component with SettingsProvider
 */
export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}
