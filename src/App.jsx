import React, { useState, useEffect, useCallback, useRef } from "react";
import { SettingsProvider, useSettings } from "./hooks/useSettings";
import { useCaptions } from "./hooks/useCaptions";
import { useToast } from "./hooks/useToast";
import { useConfirm } from "./hooks/useConfirm";
import { downloadTranscript } from "./utils/export";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import CaptionsList from "./components/CaptionsList";
import ScrollToBottom from "./components/ScrollToBottom";
import Footer from "./components/Footer";
import Settings from "./components/Settings";
import Toast from "./components/Toast";
import ConfirmDialog from "./components/ConfirmDialog";

/**
 * Main app component - manages view state and coordinates all components
 */
function AppContent() {
  const [view, setView] = useState("captions"); // "captions" | "settings"
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const captionsListRef = useRef(null);
  const prevCaptionsLengthRef = useRef(0);

  const { settings } = useSettings();
  const {
    captions,
    isCapturing,
    meetingTitle,
    meetingUrl,
    startTime,
    hideMeetCaptions,
    clearCaptions,
    toggleMeetCaptions,
    getSpeakerColor,
    speakerAvatarUrls,
  } = useCaptions();
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

  const handleScrollChange = useCallback((isAutoScrolling) => {
    setAutoScroll(isAutoScrolling);
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

  return (
    <>
      <Header
        isCapturing={isCapturing}
        hasCaptions={captions.length > 0}
        onSettingsClick={handleSettingsClick}
        onHideCaptionsClick={toggleMeetCaptions}
        hideMeetCaptions={hideMeetCaptions}
        onDownloadClick={handleDownload}
        onClearClick={handleClear}
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
            newMessageCount={newMessageCount}
            onClick={handleScrollToBottom}
          />
          <Footer captionCount={captions.length} startTime={startTime} />
        </>
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
