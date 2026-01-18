import { useState, useEffect, useCallback } from "react";

const API_KEY_STORAGE_KEY = "arbitrage_bot_api_key";

/**
 * Hook to manage API key in browser localStorage
 */
export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>("");

  // Load API key from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (stored) {
      setApiKeyState(stored);
    }
  }, []);

  // Save API key to localStorage
  const setApiKey = useCallback((key: string) => {
    if (key) {
      localStorage.setItem(API_KEY_STORAGE_KEY, key);
      setApiKeyState(key);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
      setApiKeyState("");
    }
  }, []);

  // Clear API key
  const clearApiKey = useCallback(() => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKeyState("");
  }, []);

  return {
    apiKey,
    setApiKey,
    clearApiKey,
    hasApiKey: !!apiKey,
  };
}

/**
 * Get API key from localStorage (for use outside React components)
 */
export function getApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || "";
}
