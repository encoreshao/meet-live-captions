import { useState, useEffect, useCallback } from "react";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const STORAGE_KEY = "googleAuth";

/**
 * Custom hook for Google OAuth2 authentication via chrome.identity.
 *
 * Persists user profile (name, email, avatar) in chrome.storage.local
 * with a 30-day session. After expiry the user must re-authenticate.
 */
export function useGoogleAuth() {
  const [user, setUser] = useState(null);       // { name, email, picture }
  const [loading, setLoading] = useState(true);  // initial load
  const [error, setError] = useState(null);

  // ── Restore session from storage on mount ───────────────────
  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome?.storage?.local) {
      setLoading(false);
      return;
    }

    chrome.storage.local.get([STORAGE_KEY], (data) => {
      const auth = data[STORAGE_KEY];
      if (auth && auth.user && auth.timestamp) {
        const elapsed = Date.now() - auth.timestamp;
        if (elapsed < SESSION_DURATION_MS) {
          setUser(auth.user);
        } else {
          // Session expired — clear stored data and revoke token
          clearSession();
        }
      }
      setLoading(false);
    });
  }, []);

  // ── Fetch Google user profile with an access token ──────────
  const fetchUserProfile = useCallback(async (token) => {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch user profile");
    }

    const profile = await res.json();
    return {
      name: profile.name || profile.given_name || "User",
      email: profile.email || "",
      picture: profile.picture || null,
    };
  }, []);

  // ── Persist session to chrome.storage.local ─────────────────
  const saveSession = useCallback((userInfo) => {
    if (typeof chrome !== "undefined" && chrome?.storage?.local) {
      chrome.storage.local.set({
        [STORAGE_KEY]: {
          user: userInfo,
          timestamp: Date.now(),
        },
      });
    }
  }, []);

  // ── Clear session from storage ──────────────────────────────
  const clearSession = useCallback(() => {
    if (typeof chrome !== "undefined" && chrome?.storage?.local) {
      chrome.storage.local.remove([STORAGE_KEY]);
    }
  }, []);

  // ── Sign in ─────────────────────────────────────────────────
  const signIn = useCallback(async () => {
    if (typeof chrome === "undefined" || !chrome?.identity?.getAuthToken) {
      setError("Google sign-in is only available in the Chrome extension.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (tok) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!tok) {
            reject(new Error("No token received"));
          } else {
            resolve(tok);
          }
        });
      });

      const profile = await fetchUserProfile(token);
      setUser(profile);
      saveSession(profile);
    } catch (err) {
      console.error("[GoogleAuth] Sign-in failed:", err);
      setError(err.message || "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile, saveSession]);

  // ── Sign out ────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Revoke the cached token so Chrome forgets it
      if (typeof chrome !== "undefined" && chrome?.identity?.getAuthToken) {
        const token = await new Promise((resolve) => {
          chrome.identity.getAuthToken({ interactive: false }, (tok) => {
            resolve(tok || null);
          });
        });

        if (token) {
          // Remove cached token from Chrome's identity cache
          await new Promise((resolve) => {
            chrome.identity.removeCachedAuthToken({ token }, resolve);
          });

          // Revoke the token server-side so the user is fully logged out
          try {
            await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
          } catch {
            // Revocation failure is non-critical
          }
        }
      }
    } catch (err) {
      console.error("[GoogleAuth] Sign-out error:", err);
    } finally {
      setUser(null);
      clearSession();
      setLoading(false);
    }
  }, [clearSession]);

  return {
    user,       // null when not signed in, { name, email, picture } when signed in
    loading,
    error,
    signIn,
    signOut,
    isSignedIn: !!user,
  };
}
