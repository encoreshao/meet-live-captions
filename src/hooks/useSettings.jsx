import { createContext, useContext, useState, useEffect } from "react";
import { SETTINGS_DEFAULTS } from "../constants";

const SettingsContext = createContext(null);

/**
 * Settings Provider Component
 * Manages settings state with chrome.storage.local persistence
 */
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(SETTINGS_DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  // Load settings from chrome.storage.local on mount
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome?.storage?.local) {
      chrome.storage.local.get(["settings"], (data) => {
        if (data.settings) {
          setSettings({ ...SETTINGS_DEFAULTS, ...data.settings });
        }
        setLoaded(true);
      });
    } else {
      // Dev mode - no chrome API
      setLoaded(true);
    }
  }, []);

  // Apply settings to DOM when they change
  useEffect(() => {
    if (!loaded) return;

    const root = document.documentElement;

    // Theme
    if (settings.theme === "auto") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      root.setAttribute("data-theme", settings.theme);
    }

    // Font size
    document.body.style.fontSize = settings.fontSize + "px";

    // Compact
    root.setAttribute("data-compact", settings.compact ? "true" : "false");

    // High contrast
    root.setAttribute("data-high-contrast", settings.highContrast ? "true" : "false");

    // Reduced motion
    root.setAttribute("data-reduced-motion", settings.reducedMotion ? "true" : "false");

    // Listen for system theme changes when in "auto" mode
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = () => {
      if (settings.theme === "auto") {
        const prefersDark = mediaQuery.matches;
        root.setAttribute("data-theme", prefersDark ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleThemeChange);
    return () => mediaQuery.removeEventListener("change", handleThemeChange);
  }, [settings, loaded]);

  // Save settings to chrome.storage.local when they change
  useEffect(() => {
    if (!loaded) return;

    if (typeof chrome !== "undefined" && chrome?.storage?.local) {
      try {
        chrome.storage.local.set({ settings });
      } catch (error) {
        console.error("Failed to save settings:", error);
      }
    }
  }, [settings, loaded]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(SETTINGS_DEFAULTS);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings, loaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Hook to access settings context
 */
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}
