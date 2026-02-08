import { useState, useCallback } from "react";

/**
 * Simple toast notification hook
 */
export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 2000);
  }, []);

  return { toast, showToast };
}
